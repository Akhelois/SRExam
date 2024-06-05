import { useEffect, useState } from "react";
import ExamCoordinatorNavBarComponent from "../../components/ExamCoordinator/NavBarComponents";
import AssistantNavBarComponent from "../../components/NavBarComponent";
import SubjectDevelopmentNavBarComponent from "../../components/SubjectDevelopment/NavBarComponent";
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
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [greeting, setGreeting] = useState("Welcome!");

    useEffect(() => {
        invoke<User[]>('get_all_users', {}).then((users) => {
            setUsers(users as User[]);
        });

        invoke<{ user: User }>('get_current_user').then((currentUser) => {
            if (currentUser && currentUser.user) {
                setCurrentUser(currentUser.user);
                setGreeting(`Welcome ${currentUser.user.role}`);
            } else {
                setCurrentUser(null);
                setGreeting("Welcome Guest");
            }
        }).catch((error) => {
            console.error('Failed to fetch current user:', error);
        });
    }, []);

    let NavBarComponent;

    if (currentUser?.role === 'Exam Coordinator') {
        NavBarComponent = ExamCoordinatorNavBarComponent;
    } else if(currentUser?.role === 'Subject Development'){
        NavBarComponent = SubjectDevelopmentNavBarComponent
    } else {
        NavBarComponent = AssistantNavBarComponent;
    }

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