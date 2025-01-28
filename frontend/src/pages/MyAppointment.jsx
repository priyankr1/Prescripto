import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { loadStripe } from "@stripe/stripe-js";

const MyAppointment = () => {
  const { backendUrl, token, getDoctorsData } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JAN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const slotDateFormat = (slotDate) => {
    const dateArray = slotDate.split("_");
    return (
      dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
    );
  };
  const getUserAppoitments = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/user/appointments", {
        headers: { token },
      });
      if (data.success) {
        setAppointments(data.appointment.reverse());
      }
    } catch (error) {
      toast.error(error.message);
    }
  };
  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/user/cancel-appointment",
        { appointmentId },
        { headers: { token } }
      );
      if (data.success) {
        toast.success(data.message);
        getUserAppoitments();
        getDoctorsData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const makePayment = async (appointmentId) => {
    const stripe = await loadStripe(
      "pk_test_51QKZIRBBZKZ3ubPP9VqqzgZRziUap8uDD1kR9KDaerH2HVbReBohGkxP7TfQPsuyKFjbdNHRDm2cZrqiM7Y6DM5O002CvaWcIh"
    );

    const headers = {
      "Content-Type": "application/json",
    };

    const response = await fetch(
      `${backendUrl}/api/booking/create-checkout-session`,
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ appointmentId }),
      }
    );
    const session = await response.json();

    if (!session.id) {
      console.error("Failed to create session:", session.message || session);
      return;
    }

    // Redirect to Stripe Checkout
    const result = await stripe.redirectToCheckout({
      sessionId: session.id, // Use the returned sessionId
    });
    if (result.error) {
      console.error("Error in redirectToCheckout:", result.error);
    }
  };

  useEffect(() => {
    if (token) {
      getUserAppoitments();
    }
  }, [token]);
  return (
    <div>
      <p className="pb-3 mt-12 font-medium text-zinc-700 border-b">
        My appointments
      </p>

      <div>
        {appointments.map((item, index) => (
          <div
            className="grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-2 border-b"
            key={index}
          >
            <div>
              <img
                className="w-32 bg-indigo-50"
                src={item.docData.image}
                alt=""
              />
            </div>
            <div className="flex-1 text-sm text-zinc-600">
              <p className="text-neutral-800 font-semibold">
                {item.docData.name}
              </p>
              <p>{item.docData.speciality}</p>
              <p className="text-zinc-700 font-medium mt-1">Address</p>
              <p className="text-xs">{item.docData.address.line1}</p>
              <p className="text-xs">{item.docData.address.line2}</p>
              <p className="text-sm mt-1">
                <span className="text-sm text-neutral-700 font-medium">
                  Date & Time
                </span>{" "}
                {slotDateFormat(item.slotDate)}| {item.slotTime}
              </p>
            </div>
            <div></div>
            <div className="flex flex-col gap-2 justify-end">
              {!item.cancelled && !item.isCompleted &&(
                <button
                  onClick={() => makePayment(item._id)}
                  className=" text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded-full hover:bg-primary hover:text-white transition-all duration-300"
                  disabled={item.payment}
                >
                  {item.payment ? "Paid" : "Pay Online"}         
                         </button>
              )}
              {!item.cancelled && (!item.payment && !item.isCompleted&&(
                <button
                  onClick={() => cancelAppointment(item._id)}
                  className=" text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded-full hover:bg-red-600 hover:text-white transition-all duration-300"
                >
                  Cancel appointment
                </button>
              ))}
              {item.cancelled && !item.isCompleted && (
                <button className="sm:min-w-48 py-2 border border-red-500 rounded text-red-500">
                  Appointment Cancelled
                </button>
              )}
              {
                item.isCompleted && <button className="sm:min-w-48 py-2 border border-green-500 rounded-full text-green-500">Completed</button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyAppointment;
