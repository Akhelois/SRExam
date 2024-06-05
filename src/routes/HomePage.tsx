import { useEffect, useState } from "react";
import NavBarComponent from "./../components/NavBarComponent";
import { invoke } from "@tauri-apps/api";

type User = {
    bn_number: string;
    nim: string;
    name: string;
    major: string;
    role: string;
    initial?: string;
};

export default function HomePage() {
    const [greeting] = useState("Welcome Student!");
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        invoke<User[]>('get_all_users', {}).then((users) => {
            setUsers(users as User[]);
        })
    }, []);

    return (
        <div className="h-screen">
            <NavBarComponent />
            <h1 className="text-white">
                {greeting}
            </h1>
            <div>
                {users.length > 0 ? (
                    <ul>
                        {users.map((user) => (
                            <li key={user.bn_number}>
                                {user.name} ({user.nim})
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-white">No users found.</p>
                )}
            </div>
        </div>
    );
}