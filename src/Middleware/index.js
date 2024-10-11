const admin =require('../Config/firebaseConfig');

class Middleware {
    async decodeToken(req,res,next){
        const token=req.headers.authorization.split(' ')[1];
        try{
            const decodeValue = await admin.auth().verifyIdToken(token);
            if(decodeValue){
                return next
            }
            return res.json({message:'Un authurize'})

        }catch(error){
            return res.json({message:'Internal server error'})
        }

    }
}

module.exports = new Middleware();