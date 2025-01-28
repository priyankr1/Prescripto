import express from "express";
const bookingRoute = express.Router();

import Stripe from "stripe";
import appointmentModel from "../models/appointmentModel.js";
const stripe = new Stripe(process.env.STRIPE_SECRET);

bookingRoute.post("/create-checkout-session", async (req, res) => {
    try {
        const { appointmentId } = req.body;
        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                message: "Appointment ID is required",
            });
        }
        const appointmentData = await appointmentModel.findById(appointmentId);
        if (!appointmentData || appointmentData.cancelled) {
            return res.status(404).json({
                success: false,
                message: "Appointment cancelled or not found",
            });
        }

        // Generate a unique order ID
        const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Create Stripe line items dynamically
        const lineItems = [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: `Appointment with  ${appointmentData.docData.name}`,
                    },
                    unit_amount: Math.round(appointmentData.amount * 100),
                },
                quantity: 1,
            },
        ];

        // Create a Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: "https://prescripto-6puy.vercel.app/my-appointments",
            cancel_url: "https://prescripto-6puy.vercel.app/my-appointments",
            metadata: {
                orderId: orderId,
                appointmentId: appointmentId,
                patientName: appointmentData.userId.name, // Optional: Include patient details
                doctorName: appointmentData.docData.name, // Optional: Include doctor details
            },
        });
        res.status(200).json({ id: session.id, orderId }); 
    } catch (error) {
        console.error("Error creating Stripe session:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create Stripe session",
        });
    }
});

export default bookingRoute;
