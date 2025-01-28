import { createContext, useEffect, useState } from "react";
import axios from 'axios';
import { toast } from 'react-toastify';

export const AppContext = createContext();

const AppContextProvider = (props) => {

    const currencySymbol = '$';
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // Load token from localStorage if available
    const [token, setToken] = useState(localStorage.getItem('token') || false);
    const [userData, setUserData] = useState(false);

    // Load doctors from localStorage if available, otherwise set to an empty array
    const [doctors, setDoctors] = useState(() => {
        const storedDoctors = localStorage.getItem('doctors');
        return storedDoctors ? JSON.parse(storedDoctors) : [];
    });

    // Fetch doctors data and store it in state and localStorage
    const getDoctorsData = async () => {
        try {
            const { data } = await axios.get(`${backendUrl}/api/doctor/list`);
            if (data.success) {
                setDoctors(data.doctors);
                localStorage.setItem('doctors', JSON.stringify(data.doctors)); // Store doctors in localStorage
            }
        } catch (error) {
            toast.error(error.message);
        }
    };
    useEffect(() => {
        getDoctorsData();
    }, []); // Fetch fresh data on mount
    
    const refreshDoctors = async () => {
        localStorage.removeItem('doctors'); // Clear localStorage
        await getDoctorsData(); // Fetch fresh data
    };
    

    // Load user data based on the token
    const loadUserData = async () => {
        if (!token) return;
        try {
            const { data } = await axios.get(`${backendUrl}/api/user/get-profile`, { headers: { token } });
            if (data.success) {
                setUserData(data.userData);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Set token in state and localStorage
    const updateToken = (newToken) => {
        setToken(newToken);
        if (newToken) {
            localStorage.setItem('token', newToken);
        } else {
            localStorage.removeItem('token');
        }
    };

    // Initial load of doctors data if it's not available in localStorage
    useEffect(() => {
        if (!doctors.length) {
            getDoctorsData();
        }
    }, []); // Only run once on component mount

    // Load user data if token exists, otherwise clear user data
    useEffect(() => {
        if (token) {
            loadUserData();
        } else {
            setUserData(false);
        }
    }, [token]); // Re-run when the token changes

    const value = {
        doctors,
        getDoctorsData,
        currencySymbol,
        token,
        setToken: updateToken, // Use updateToken to update the token
        backendUrl,
        userData,
        setUserData,
        loadUserData,
        refreshDoctors
    };

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
};

export default AppContextProvider;
