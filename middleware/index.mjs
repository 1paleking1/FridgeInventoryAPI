import { auth } from '../firebaseConfig.mjs';

const decodeToken = async (req, res, next) => {

    // console.log(JSON.stringify(req.headers));

    const token = req.headers.authorization.split(' ')[1]

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