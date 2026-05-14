const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const omise = require('omise')
const crypto = require('crypto')

initializeApp()
const db = getFirestore()

setGlobalOptions({ region: 'asia-southeast1' })

exports.createCharge = onCall({ secrets: ['OMISE_SECRET_KEY'] }, async (request) => {
    const OMISE_SECRET_KEY = process.env.OMISE_SECRET_KEY
    if (!OMISE_SECRET_KEY) {
        throw new HttpsError('failed-precondition', 'OMISE_SECRET_KEY not set in secrets.')
    }

    const client = omise({ secretKey: OMISE_SECRET_KEY })
    const { source, token, courtId, date, hours, phone, tenantId, userId, displayName } =
        request.data

    try {
        // Calculate price server-side — never trust the client-supplied amount.
        const settingsSnap = await db.collection('settings').doc(tenantId).get()
        if (!settingsSnap.exists) {
            throw new HttpsError('not-found', 'Venue configuration not found.')
        }
        const settings = settingsSnap.data()
        const court = settings.courts.find((c) => c.id === Number(courtId))
        if (!court) {
            throw new HttpsError('not-found', `Court ${courtId} not found.`)
        }
        const hoursArray = hours.split(',').map(Number)
        let calculatedTHB = 0
        for (const hour of hoursArray) {
            const cp = court.pricing
            if (cp && cp.length > 0) {
                const rule = cp.find((p) => hour >= p.start && hour < p.end)
                if (rule) { calculatedTHB += rule.rate; continue }
            }
            const dp = settings.defaultPricing || settings.pricing || []
            const defaultRule = dp.find((p) => hour >= p.start && hour < p.end)
            calculatedTHB += defaultRule ? defaultRule.rate : 0
        }
        const amountInSatang = calculatedTHB * 100

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
        const chargeData = {
            amount: amountInSatang,
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
            amount: calculatedTHB,
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
        if (error instanceof HttpsError) throw error
        throw new HttpsError('internal', 'An internal error occurred.')
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

        // Ownership check: LINE LIFF users don't have Firebase Auth in this app's current
        // architecture (no custom token minting), so request.auth is null for them.
        // This guard enforces ownership when Firebase Auth IS present (e.g. future admin use).
        if (request.auth && booking.userId && request.auth.uid !== booking.userId) {
            throw new HttpsError('permission-denied', 'Access denied.')
        }

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
        if (error instanceof HttpsError) throw error
        throw new HttpsError('internal', 'An internal error occurred.')
    }
})

exports.omiseWebhook = onRequest({ secrets: ['OMISE_WEBHOOK_SECRET'] }, async (req, res) => {
    const OMISE_WEBHOOK_SECRET = process.env.OMISE_WEBHOOK_SECRET
    if (!OMISE_WEBHOOK_SECRET) {
        console.error('OMISE_WEBHOOK_SECRET not configured')
        res.status(500).send('Server configuration error')
        return
    }

    const signature = req.headers['x-omise-signature']
    if (!signature) {
        console.warn('Webhook rejected: missing x-omise-signature header')
        res.status(401).send('Unauthorized')
        return
    }

    const expected = crypto
        .createHmac('sha256', OMISE_WEBHOOK_SECRET)
        .update(req.rawBody)
        .digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        console.warn('Webhook rejected: signature mismatch')
        res.status(401).send('Invalid signature')
        return
    }

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
