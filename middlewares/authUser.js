import jwt from "jsonwebtoken";


async function authUser(req, res, next) {
    const { token } = req.cookies;

    if (!token) {
        return res.json({ success: false, message: 'Not authorized' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.id) {
            return res.json({ success: false, message: 'Not authorized' });
        }

        req.user = { _id: decoded.id }; // Мінімально. Або діставай повного юзера з БД
        next();

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}

export default authUser;
