import express from 'express'
import { Expo } from 'expo-server-sdk'
import * as schedule from 'node-schedule'
import cors from 'cors'

// my file imports
import { db } from './firebaseConfig.mjs'
import { decodeToken } from './middleware/index.mjs'

const app = express()
const port = 3000
const expo = new Expo()

// middleware
app.use(express.json())
app.use(cors())
app.use(decodeToken)

// helper functions

const getTodayDate = () => {
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let yyyy = today.getFullYear();

    today = mm + '/' + dd + '/' + yyyy;
    return today;
}

const getPushTokens = async (fridge_id) => {

    const fridgeRef = db.collection("users")
    const querySnapshot = await fridgeRef.where("fridge_id", "==", fridge_id).get()
    const docs = querySnapshot.docs

    let push_tokens = []
    for (const doc of docs) {
        push_tokens = push_tokens.concat(doc.data().devices)
    }

    return push_tokens
}

const getUsername = (email) => {
    return email.split('@')[0]
}

const getNotificationDate = (days_to_wait) => {
    const date = new Date()
    date.setSeconds(date.getSeconds() + 10) // temporary test code
    return date
}

const handleSendNotification = async (admin, fridge_id, product_name, product_type, job_name) => {

    // first save the notification to the database

    const fridgeRef = db.collection("fridges").doc(fridge_id).collection("notifications").doc(job_name)
    
    const notification = {
        product_name: product_name,
        date_added: getTodayDate(),
    }

    await fridgeRef.set(notification)

    // then send the notification to the user's devices

    const username = getUsername(admin)
    const message = `It's been a week since ${product_name} was added to ${username}'s fridge.`
    const push_tokens = await getPushTokens(fridge_id)

    const messages = push_tokens.map(token => ({
        to: token,
        sound: 'default',
        title: 'Fridge Inventory',
        body: message,
    }))

    try {
        const ticketChunk = await expo.sendPushNotificationsAsync(messages)
        console.log('Tickets:', ticketChunk)

        const receiptIds = ticketChunk
            .filter(ticket => ticket.id)
            .map(ticket => ticket.id)
        
        const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds)
        for (const chunk of receiptIdChunks) {
            try {
                const receipts = await expo.getPushNotificationReceiptsAsync(chunk)
                console.log('Receipts:', receipts)
            } catch (error) {
                console.error('Error fetching receipts:', error)
            }
        }
    } catch (error) {
        console.error('Error sending notifications:', error)
    }
}

// API routes

app.post('/scheduleNotification', async (req, res) => {

    
    const { admin, fridge_id, product_name, product_type, product_id } = req.body

    if (!admin || !fridge_id || !product_name || !product_type || !product_id) {
        return res.status(400).send('Invalid request parameters');
    }
    
    const job_name = `${fridge_id}_${product_id}`

    try {

        schedule.scheduleJob(job_name, getNotificationDate(7), async () => {
            handleSendNotification(admin, fridge_id, product_name, product_type, job_name)
        })
    
        res.status(200).send('Notification scheduled successfully')

    } catch (e) {
        console.error(e)
        res.status(500).send('Internal server error scheduling notification')
    }

})

app.post('/cancelNotification', async (req, res) => {

    if (!job_name) {
        return res.status(400).send('Invalid request parameters');
    }

    const { job_name } = req.body
    const job_to_cancel = schedule.scheduledJobs[job_name]

    try {

        if (job_to_cancel) {
            job_to_cancel.cancel()
            res.status(200).send('Notification cancelled')
        } else {
            res.status(404).send('Job (notification) attempted to be cancelled was not found')
        }
    } catch (e) {
        console.error(e)
        res.status(500).send('Internal server error cancelling notification')
    }

})

app.get('/test', (req, res) => {
    res.send('API is working')
})

app.listen(process.env.PORT || port, () => {
    console.log(`Server running on port ${port}`)
})