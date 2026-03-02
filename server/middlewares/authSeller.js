import jwt from "jsonwebtoken";


const authSeller = async(req, res, next) =>{
    const {sellerToken} = req.cookies;
    if(!sellerToken){
     return res.json({ success: false, message: 'Not Authorized' });
    }

        try {
            const tokenDecode = jwt.verify(sellerToken, process.env.JWT_SECRET);
    
            if (tokenDecode.email === process.env.SELLER_EMAIL) {
                next();
            }else{
               return res.json({ success: false, message: 'Not Authorized' });
            }
    
        } catch (error) {
            return res.json({ success: false, message: error.message });
        }
       
}



//seller isAuth: /api/user/is-auth

export const isSellerAuth = async (req, res) => {
  try {

    
    return res.json({ success: true})
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
}

export default authSeller

