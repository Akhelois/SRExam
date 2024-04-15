import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react'
import {Link as RouterLink} from 'react-router-dom'

export default function NavbarComponent() {
    const [user, setUser] = useState<User | null>(null);
    const [greeting, setGreeting] = useState("Guest");

    useEffect(() => {
        invoke('get_current_user').then((user) => {
            console.log(user);
            setUser(user as User);
        });
    }, []);

    useEffect(() => {
        if (user) {
            setGreeting("Hello, " + user.username);
        }
    }, [user]);

    return (
        <div className="flex flex-row w-screen justify-between items-center px-12 py-4 shadow">
            <div className="flex flex-row items-center gap-4">
                <p className="text-3xl font-bold">
                    SR Exam
                </p>
                <RouterLink to={"/"}>
                    <p className="text-xl">
                        Home
                    </p>
                </RouterLink>
            </div>
            <div className="flex flex-row items-center">
                <p>
                    {greeting}
                </p>
                <RouterLink to={"/auth/login"}>
                    <p className="text-xl">
                        Login
                    </p>
                </RouterLink>
            </div>
        </div>
    );
}