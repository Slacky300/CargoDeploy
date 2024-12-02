import mongoose from "mongoose";

export const connectDB = async (dbURL: string) => {

    try{
        const conn = await mongoose.connect(dbURL);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    }catch(err){
        if (err instanceof Error) {
            console.log(err.message);
        } else {
            console.log(String(err));
        }
        process.exit(1);
    }

}