import { auth } from './firebaseConfig.js';

const decodeToken = async (req, res, next) => {

    // console.log(JSON.stringify(req.headers));

    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({ message: 'Unauthorized must provide token' })
    }

    // another change

    const token = authHeader.split(' ')[1]

    const decodedToken = await auth.verifyIdToken(token)

    try {

        if (decodedToken) {
            return next()
        }
    
        return res.status(401).json({ message: 'Unauthorized' })
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' })
    }
}

export { decodeToken };