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
        const expiresAt = new Date(Date.now() + 60 * 1000).toISOString()
        const chargeData = {
            amount: amount,
            currency: 'thb',
            description: `Booking for ${displayName} at Court ${courtId} on ${date}`,
            // return_uri สำหรับกรณีที่ลูกค้าไม่ได้จ่ายผ่านหน้าเรา (เช่นไปจ่ายที่แอปธนาคารแล้วระบบเด้งกลับ)
            return_uri: `https://${process.env.GCLOUD_PROJECT}.web.app/success`,
            expires_at: expiresAt,
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

exports.checkBookingStatus = onCall({ secrets: ['OMISE_SECRET_KEY'] }, async (request) => {
    const { bookingId } = request.data
    const OMISE_SECRET_KEY = process.env.OMISE_SECRET_KEY
    if (!OMISE_SECRET_KEY) {
        throw new HttpsError('failed-precondition', 'OMISE_SECRET_KEY not set in secrets.')
    }

    const client = omise({ secretKey: OMISE_SECRET_KEY })

    try {
        const bookingSnap = await db.collection('bookings').doc(bookingId).get()
        if (!bookingSnap.exists) {
            throw new HttpsError('not-found', 'Booking not found.')
        }

        const booking = bookingSnap.data()
        // If it's already in a final state, just return
        if (booking.status === 'paid' || booking.status === 'expired' || booking.status === 'failed') {
            return { success: true, status: booking.status }
        }

        // Retrieve the latest charge status from Omise
        const charge = await client.charges.retrieve(booking.omiseChargeId)

        let newStatus = booking.status
        if (charge.status === 'successful') {
            newStatus = 'paid'
        } else if (charge.status === 'failed') {
            // Omise failure_code can be 'expired_charge' when it expires
            newStatus = charge.failure_code === 'expired_charge' ? 'expired' : 'failed'
        } else if (charge.status === 'expired') {
            newStatus = 'expired'
        }

        // If the status has changed, update Firestore
        if (newStatus !== booking.status) {
            await bookingSnap.ref.update({
                status: newStatus,
                paidAt: newStatus === 'paid' ? FieldValue.serverTimestamp() : null
            })
        }

        return { success: true, status: newStatus }
    } catch (error) {
        console.error('Check Charge Error:', error)
        throw new HttpsError('internal', error.message)
    }
})

exports.omiseWebhook = onRequest(async (req, res) => {
    const event = req.body
    console.log('Omise Webhook received! Key:', event.key, 'Full Payload:', JSON.stringify(event))
    if (event.key === 'charge.complete') {
        const charge = event.data
        try {
            const snapshot = await db
                .collection('bookings')
                .where('omiseChargeId', '==', charge.id)
                .limit(1)
                .get()

            if (!snapshot.empty) {
                let newStatus = charge.status === 'successful' ? 'paid' : 'failed'
                // If Omise specifically says it's expired, update status to 'expired'
                if (charge.status === 'failed' && charge.failure_code === 'expired_charge') {
                    newStatus = 'expired'
                }

                await snapshot.docs[0].ref.update({
                    status: newStatus,
                    paidAt: charge.status === 'successful' ? FieldValue.serverTimestamp() : null
                })
            }
        } catch (error) {
            console.error('Webhook Error:', error)
        }
    }
    res.status(200).send('OK')
})
