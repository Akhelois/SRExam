import { useState } from "react";
import NavBarComponent from "./../components/NavBarComponent";

export default function HomePage() {
const [greeting] = useState("Welcome to SR Exam");


    return(
        <div className="h-screen">
            <NavBarComponent/>
            <h1>
                {greeting}
            </h1>
        </div>
    )
}