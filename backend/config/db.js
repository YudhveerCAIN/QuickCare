const mongoose=require('mongoose');
const connectDB=async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Mongo connected');
    }catch(err){
        console.log('error',err.message);
        process.exit(1);
    }
}
module.exports=connectDB;