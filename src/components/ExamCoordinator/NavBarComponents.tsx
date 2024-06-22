import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

type User = {
    bn_number: string;
    nim: string;
    name: string;
    major: string;
    role: string;
    initial?: string;
};

export default function NavbarComponent() {
    const [user, setUser] = useState<User | null>(null);
    const [greeting, setGreeting] = useState("Guest");
    const location = useLocation();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        invoke<{ user: User }>('get_current_user').then((currentUser) => {
            if (currentUser && currentUser.user) {
                setUser(currentUser.user);
            } else {
                setUser(null);
            }
        }).catch((error) => {
            console.error('Failed to fetch current user:', error);
        });
    }, []);

    useEffect(() => {
        if (user) {
            setGreeting(`Welcome ${user.name}`);
        } else {
            setGreeting("Guest");
        }
    }, [user]);

    const handleDropdownToggle = () => {
        setIsDropdownOpen(!isDropdownOpen); 
    };

    const handleDropdownClose = () => {
        setIsDropdownOpen(false); 
    };

    const DropdownMenu = () => (
        <div
            className={`absolute mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 ${isDropdownOpen ? 'block' : 'hidden'}`}
            onMouseLeave={handleDropdownClose}
        >
            <RouterLink
                to="/exam_scheduler"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={handleDropdownClose}
            >
                ExamSchedulerForStudent
            </RouterLink>
            <RouterLink
                to="/exam_scheduler2"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={handleDropdownClose}
            >
                ExamSchedulerForAssistant
            </RouterLink>
        </div>
    );

    return (
        <div className="flex justify-between items-center bg-black text-white h-16 px-8">
            <div className="flex items-center gap-4">
                <RouterLink to={"/other_role_home_page"}>
                    <img src="src/assets/logo-white.png" alt="Logo SR Exam" width={50} />
                </RouterLink>
                {location.pathname !== '/' && (
                    <>
                        <RouterLink to={"/other_role_home_page"} className="text-sm">
                            View Transaction
                        </RouterLink>
                        <RouterLink to={"/view_schedule"} className="text-sm">
                            View Schedule
                        </RouterLink>
                        <div className="relative inline-block">
                            <span
                                className="text-sm cursor-pointer"
                                onClick={handleDropdownToggle}
                            >
                                ExamScheduler
                            </span>
                            <DropdownMenu />
                        </div>
                        <RouterLink to={"/subject_management"} className="text-sm">
                            Subject Management
                        </RouterLink>
                        <RouterLink to={"/user_management"} className="text-sm">
                            User Management
                        </RouterLink>
                        <RouterLink to={"/room_management"} className="text-sm">
                            Room Management
                        </RouterLink>
                        <RouterLink to={"/report_management"} className="text-sm">
                            Report Management
                        </RouterLink>
                    </>
                )}
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-blue-400">{greeting}</span>
                {user && location.pathname !== '/' && (
                    <>
                        <RouterLink to={"/profile_page"} className="text-sm">
                            Profile
                        </RouterLink>
                        <RouterLink to={"/"} className="text-sm">
                            Logout
                        </RouterLink>
                    </>
                )}
            </div>
        </div>
    );
}