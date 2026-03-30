const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const omise = require('omise')

initializeApp()
const db = getFirestore()

setGlobalOptions({ region: 'asia-southeast1' })

exports.createCharge = onCall({ secrets: ['OMISE_SECRET_KEY'] }, async (request) => {
    const OMISE_SECRET_KEY = process.env.OMISE_SECRET_KEY
    if (!OMISE_SECRET_KEY) {
        throw new HttpsError('failed-precondition', 'OMISE_SECRET_KEY not set in secrets.')
    }

    const client = omise({ secretKey: OMISE_SECRET_KEY })
    const { amount, source, token, courtId, date, hours, phone, tenantId, userId, displayName } =
        request.data

    try {
        const chargeData = {
            amount: amount,
            currency: 'thb',
            description: `Booking for ${displayName} at Court ${courtId} on ${date}`,
            // return_uri สำหรับกรณีที่ลูกค้าไม่ได้จ่ายผ่านหน้าเรา (เช่นไปจ่ายที่แอปธนาคารแล้วระบบเด้งกลับ)
            return_uri: `https://${process.env.GCLOUD_PROJECT}.web.app/success`,
            metadata: { tenantId, courtId, date, hours, phone, userId }
        }

        if (source) {
            chargeData.source = source
        } else if (token) {
            chargeData.card = token
        }

        const charge = await client.charges.create(chargeData)

        // ดึง QR Image URL ถ้าเป็น PromptPay
        let qrImage = null
        if (charge.source && charge.source.scannable_code) {
            qrImage = charge.source.scannable_code.image.download_uri
        }

        const bookingData = {
            tenantId,
            courtId,
            date,
            hours: hours.split(',').map(Number),
            phone,
            amount: amount / 100,
            status: charge.status === 'successful' ? 'paid' : 'pending',
            omiseChargeId: charge.id,
            userId,
            displayName,
            createdAt: FieldValue.serverTimestamp(),
            paymentType: source ? 'promptpay' : 'credit_card',
            authorizeUri: charge.authorize_uri || null,
            qrImage: qrImage // บันทึกรูป QR ไว้ด้วย
        }

        const bookingRef = await db.collection('bookings').add(bookingData)

        return {
            success: true,
            chargeId: charge.id,
            status: charge.status,
            authorizeUri: charge.authorize_uri,
            qrImage: qrImage, // ส่งรูป QR กลับไป
            bookingId: bookingRef.id
        }
    } catch (error) {
        console.error('Omise Charge Error:', error)
        throw new HttpsError('internal', error.message)
    }
})

exports.omiseWebhook = onRequest(async (req, res) => {
    const event = req.body
    if (event.key === 'charge.complete') {
        const charge = event.data
        try {
            const snapshot = await db
                .collection('bookings')
                .where('omiseChargeId', '==', charge.id)
                .limit(1)
                .get()

            if (!snapshot.empty) {
                await snapshot.docs[0].ref.update({
                    status: charge.status === 'successful' ? 'paid' : 'failed',
                    paidAt: charge.status === 'successful' ? FieldValue.serverTimestamp() : null
                })
            }
        } catch (error) {
            console.error('Webhook Error:', error)
        }
    }
    res.status(200).send('OK')
})
