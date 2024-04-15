import { useState } from "react";
import { invoke } from "@tauri-apps/api";
import NavBarComponent from "./../components/NavBarComponent.tsx";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        password: ""
    });

    const handleInputChange = (event: { target: { name: any; value: any; }; }) => {
        const { name, value } = event.target;
        setFormData(prevFormData => ({
            ...prevFormData,
            [name]: value
        }));
    };

    const login = () => {
        invoke('login', formData)
            .then((success) => {
                console.log(success)
                if (success) {
                    navigate('/', { replace: true });
                }
            });
    };

    return (
        <div className="h-screen">
            <NavBarComponent/>
            <form>
                <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Username"
                />
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Password"
                />
                <button type="button" onClick={login}>Login</button>
            </form>
        </div>
    );
}