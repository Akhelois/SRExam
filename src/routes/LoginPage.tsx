import { useState } from "react";
import { invoke } from "@tauri-apps/api";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", password: "" });
  const [error, setError] = useState("");

  const handleInputChange = (event: { target: { name: any; value: any; }; }) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const login = () => {
    if (!formData.name || !formData.password) {
      setError("Please fill in all fields.");
      return;
    }

    invoke("login", { name: formData.name, password: formData.password })
      .then((result) => {
        if (result) {
          if (result === "initial") {
            navigate("/other_role_home_page", { replace: true });
          } else {
            navigate("/home", { replace: true });
          }
        } else {
          setError("Invalid name or password.");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("An error occurred. Please try again.");
      });
  };

  return (
    <div className="bg-black h-screen flex items-center justify-center">
      <div>
        <img className="size-32 mb-8" src="src/assets/logo-white.png" alt="Logo SR Exam" />
        <h1 className="text-center text-2xl mb-6 font-bold text-white">Login Page</h1>
        <form className="bg-slate-200 shadow-md rounded px-8 pt-6 pb-8 mb-4 items-center justify-center">
          <div className="mb-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Username"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-6">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="flex items-center justify-center">
            <button type="button" onClick={login} className="bg-slate-500 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}