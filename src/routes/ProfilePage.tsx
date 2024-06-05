import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api';
import { useNavigate } from 'react-router-dom';
import NavBarComponent from './../components/NavBarComponent';

type User = {
  bn_number: string;
  nim: string;
  name: string;
  major: string;
  role: string;
  initial?: string;
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    invoke<{ user: User }>('get_current_user').then((currentUser) => {
      if (currentUser && currentUser.user) {
        setUser(currentUser.user);
      } else {
        setUser(null);
        navigate('/', { replace: true });
      }
    }).catch((error) => {
      console.error('Failed to fetch current user:', error);
    });
  }, [navigate]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prevFormData => ({
      ...prevFormData,
      [name]: value
    }));
  };

  const changePassword = () => {
    const { oldPassword, newPassword, confirmNewPassword } = formData;

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword === oldPassword) {
      setError("New password must not be the same as the old password.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New password and confirm new password do not match.");
      return;
    }

    invoke<boolean>('change_password', { oldPassword, newPassword })
      .then((result) => {
        if (result) {
          setSuccess("Password changed successfully.");
          setError("");
        } else {
          setError("Invalid old password.");
          setSuccess("");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("An error occurred. Please try again.");
        setSuccess("");
      });
  };

  const logout = () => {
    navigate('/', { replace: true });
  };

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <div className="h-screen bg-zinc-950">
      <NavBarComponent />
      <div className="p-8">
        <h1 className="text-3xl text-white mb-8">Profile Page</h1>
        <div className="bg-white text-black p-6 rounded shadow-md">
          <h2 className="text-xl mb-4">User Information</h2>
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>NIM:</strong> {user.nim}</p>
          <p><strong>Major:</strong> {user.major}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Initial:</strong> {user.initial}</p>
        </div>
        <div className="bg-white p-6 rounded shadow-md mt-8">
          <h2 className="text-xl text-black mb-4">Change Password</h2>
          <form>
            <div className="mb-4 text-black">
              <input
                type="password"
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleInputChange}
                placeholder="Old Password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <div className="mb-4">
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="New Password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <div className="mb-4">
              <input
                type="password"
                name="confirmNewPassword"
                value={formData.confirmNewPassword}
                onChange={handleInputChange}
                placeholder="Confirm New Password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
            {success && <p className="text-green-500 text-xs italic mb-4">{success}</p>}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={changePassword}
                className="bg-slate-500 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Change Password
              </button>
            </div>
          </form>
        </div>
        <div className="flex items-center justify-center mt-8">
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
