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
    const [greeting, setGreeting] = useState("-");
    const location = useLocation();

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

    return (
        <div className="flex flex-row w-screen justify-between items-center px-16 py-5 shadow bg-black text-white">
            <div className="flex flex-row items-center gap-4">
                <RouterLink to={"/home"}>
                    <img src="src/assets/logo-white.png" alt="Logo SR Exam" width={72}/>
                </RouterLink>
                {location.pathname !== '/' && (
                    <RouterLink to={"/home"}>
                        <p className="text-xl">
                            Home
                        </p>
                    </RouterLink>
                )}
            </div>
            <div className="flex flex-row items-center gap-4 text-blue-400">
                <p>{greeting}</p>
                {user && location.pathname !== '/' && (
                    <>
                        <RouterLink to={"/profile_page"}>
                            <p className="text-xl">Profile</p>
                        </RouterLink>
                        <RouterLink to={"/"}>
                            <p className="text-xl">Logout</p>
                        </RouterLink>
                    </>
                )}
            </div>
        </div>
    );
}