import validator from "validator"
import bcrypt from 'bcrypt'
import userModel from "../models/userModel.js"
import jwt from "jsonwebtoken"
import { v2 as cloudinary } from "cloudinary"
import doctorModel from "../models/doctorModel.js"
import appointmentModel from "../models/appointmentModel.js"

//Api to register user
const registerUser = async(req,res)=>{
    try {
        const {name,email,password}=req.body

        if(!name||!password||!email){
            return res.json({success:false,message:"Missing Details"})
        }

        if(!validator.isEmail(email)){
            return res.json({success:false,message:"enter valid email"})
        }
        if (password.length<8) {
            return res.json({success:false,message:"enter valid password"})
        }

        //hashing user password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword=await bcrypt.hash(password,salt)

        const userData ={
            name,
            email,
            password:hashedPassword           
        }

        const newUser=new userModel(userData)
        const user=await newUser.save()
        //_id
        const token =jwt.sign({id:user._id},process.env.JWT_SECRET)
        res.json({success:true,token:token})
    } catch (error) {
     
        res.json({success:false,message:error.message})
    }
}

// Api for user login 

const loginUser = async (req,res)=>{
    try {
        const{email,password}=req.body
        const user=await userModel.findOne({email})
        if (!user) {
            return   res.json({success:false,message:"user dont exist "})
        }
        const isMatch= await bcrypt.compare(password,user.password)
        if(isMatch){
            const token=jwt.sign({id:user._id},process.env.JWT_SECRET)
            res.json({success:true,token})
        }else{
            res.json({success:false,message:"Invalid credentials"})
        }
    } catch (error) {
       
        res.json({success:false,message:error.message})
    }
}

//Api to get user Data
const getProfile = async(req,res)=>{
    try {
        
        const {userid}=req.body
        const userData= await userModel.findById(userid).select('-password')
        res.json({success:true,userData})
    } catch (error) {
     res.json({success:false,message:error.message})   
    }
}

const updateProfile= async (req,res)=>{
    const {userid,name,phone,address,gender,dob}=req.body
    const  imageFile=req.file
    if(!name||!phone||!dob||!gender){
        return res.json({success:false,message:"Data Missing"})
    }
    await userModel.findByIdAndUpdate(userid,{name,phone,gender,address:JSON.parse(address),dob})

    if(imageFile){
        const imageUpload=await cloudinary.uploader.upload(imageFile.path,{resource_type:'image'})
        const imageUrl=imageUpload.secure_url

        await userModel.findByIdAndUpdate(userid,{image:imageUrl})
    }
    res.json({success:true,message:'Profile Updated'})
}

//Api to book appointments 

const bookAppointment = async (req,res)=>{
    
    try {
        const {userid,docId,slotTime,slotDate}=req.body
        const docData=await doctorModel.findById(docId).select('-password')

        if (!docData.available) {
            return res.json({success:false,message:"Doctor not available"})
        }

        let slots_booked=docData.slots_booked

        //checking for slots availablety
        if(slots_booked[slotDate]){
            if(slots_booked[slotDate].includes(slotTime)){
                return res.json({success:false,message:"Slot not available"})
            }else{
                slots_booked[slotDate].push(slotTime)
            }
        }else{
            slots_booked[slotDate]=[]
            slots_booked[slotDate].push(slotTime)
        }
        const userData =await userModel.findById(userid).select('-password')
        delete docData.slots_booked

        const appointmentData={
            userId:userid,
            docId,userData,
            docData,
            amount:docData.fees,
            slotDate,
            slotTime,
            date:Date.now()
        }
        const newAppointment =new appointmentModel(appointmentData)
        await newAppointment.save()

        //save new slots data in docData
        await doctorModel.findByIdAndUpdate(docId,{slots_booked})

        res.json ({success:true,message:"appointment booked"})
    } catch (error) {
        res.json({success:false,message:error.message})      
    }
}

//Api to get user appointment for frontend

const listAppointment = async (req,res)=>{

    try {
        const {userid}=req.body
        const userId=userid
        const appointment=await appointmentModel.find({userId})
        res.json({success:true,appointment})
    } catch (error) {
        res.json({success:false,message:error.message})      
    }
}

//Api to delete the  appointment  
const cancelAppointment= async(req,res)=>{
    try {
        const {userid,appointmentId}=req.body
        const appointmentData= await appointmentModel.findById(appointmentId)
        //verify appointment user
       
        if(appointmentData.userId !==userid){
            return res.json({success:false,message:'Unathorized action'})
        }
        await appointmentModel.findByIdAndUpdate(appointmentId,{cancelled:true})

        //releasing doctor slot
        const {docId,slotTime,slotDate}=appointmentData
        const doctorData=await doctorModel.findById(docId)

        let slots_booked= doctorData.slots_booked
        
        slots_booked[slotDate]= slots_booked[slotDate].filter(e => e!==slotTime)

        await doctorModel.findByIdAndUpdate(docId,{slots_booked})
        res.json({success:true,message:'Appointment cancelled'})
    } catch (error) {
       
        res.json({success:false,message:error.message})    
    }
}



export {registerUser,loginUser,getProfile,updateProfile,bookAppointment,listAppointment,cancelAppointment}