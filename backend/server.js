import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoute.js';
import bookingRoute from './routes/bookingRoute.js';
import bookingModel from './models/appointmentModel.js';

//app config
const app=express();
const port= process.env.PORT||4000
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET);

connectDB();
//midlewares
const updateBooking=async(appointmentId)=>{
    try{
await bookingModel.findByIdAndUpdate(appointmentId,{payment:true},{new:true});

    }catch(err){
        res.status(500).json({
            success:false,
            message:"Unknown error occured"
        })
    }
}

app.post('/webhook',express.raw({type:"application/json"}),(request, response) => {
    const sig = request.headers["stripe-signature"];
    let event;
  console.log("webhook working");
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        sig,
        process.env.WEBHOOK_SECRET
      );
    } catch (err) {
      response.status(400).send('Webhook Error: ${err.message}');
      return;
    }
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const paymentIntentSucceeded = event.data.object;
        let session = event.data.object;
        
       updateBooking(session.metadata.appointmentId);
        // Then define and call a function to handle the event payment_intent.succeeded
        break;
      // ... handle other event types
      default:
        console.log('Unhandled event type ${event.type}');
    }
  
    // Return a 200 response to acknowledge receipt of the event
    response.send();
  }
);
connectCloudinary();

app.use(express.json())
app.use(cors())



//api endpoint
app.use("/api/admin",adminRouter)
app.use("/api/doctor/",doctorRouter)
app.use("/api/user",userRouter)
app.use("/api/booking",bookingRoute)
app.get('/',(req,res)=>{
    res.send("API WORKING ")
})

app.listen(port,()=> console.log("Server Started",port))