import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';
import 'tailwindcss/tailwind.css';
import NavBarComponent from "../../../../components/ExamCoordinator/NavBarComponents";

type User = {
    bn_number: string;
    nim: string;
    name: string;
    major: string;
    role: string;
    initial?: string;
};

type Schedule = {
    type: 'Exam' | 'Proctor';
    time: string;
    description: string;
};

export default function ViewSchedule() {
    const [assistants, setAssistants] = useState<User[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [filterGeneration, setFilterGeneration] = useState<string>('');
    const [searchInitial, setSearchInitial] = useState<string>('');
    const [searchNIM, setSearchNIM] = useState<string>('');
    const [hoveredSchedule, setHoveredSchedule] = useState<Schedule | null>(null);

    useEffect(() => {
        invoke<User[]>('get_all_users', {}).then((users) => {
            const assistants = users.filter(user => user.role === 'Assistant');
            const students = users.filter(user => user.role === 'Student');
            setAssistants(assistants);
            setStudents(students);
        });
    }, []);

    const handleHover = (schedule: Schedule) => {
        setHoveredSchedule(schedule);
    };

    const filteredAssistants = assistants.filter(assistant => assistant.major.includes(filterGeneration) && assistant.initial?.includes(searchInitial));
    const filteredStudents = students.filter(student => student.nim.includes(searchNIM));

    return (
        <div className="p-4">
            <NavBarComponent/>
            <div className="mb-4">
                <h2 className="text-xl font-bold">View Assistant Schedule</h2>
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        placeholder="Filter by Generation"
                        value={filterGeneration}
                        onChange={e => setFilterGeneration(e.target.value)}
                        className="p-2 border rounded"
                    />
                    <input
                        type="text"
                        placeholder="Search by Initial"
                        value={searchInitial}
                        onChange={e => setSearchInitial(e.target.value)}
                        className="p-2 border rounded"
                    />
                </div>
                <div className="mt-4">
                    <table className="min-w-full bg-white border text-black">
                        <thead>
                            <tr className="text-black">
                                <th className="px-4 py-2 ">Name</th>
                                <th className="px-4 py-2">NIM</th>
                                <th className="px-4 py-2">Major</th>
                                <th className="px-4 py-2">Schedule</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAssistants.map(assistant => (
                                <tr key={assistant.bn_number}>
                                    <td className="border px-4 py-2 text-black">{assistant.name}</td>
                                    <td className="border px-4 py-2 text-black">{assistant.nim}</td>
                                    <td className="border px-4 py-2 text-black">{assistant.major}</td>
                                    <td className="border px-4 py-2">
                                        <div
                                            className="bg-red-600 p-2 rounded"
                                            onMouseEnter={() => handleHover({ type: 'Exam', time: '10:00 - 12:00', description: 'Math Exam' })}
                                            onMouseLeave={() => setHoveredSchedule(null)}
                                        >
                                            Exam
                                        </div>
                                        <div
                                            className="bg-amber-500 p-2 rounded mt-2"
                                            onMouseEnter={() => handleHover({ type: 'Proctor', time: '12:00 - 14:00', description: 'Proctoring' })}
                                            onMouseLeave={() => setHoveredSchedule(null)}
                                        >
                                            Proctor
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {hoveredSchedule && (
                    <div className="absolute p-4 bg-white border rounded shadow-lg text-black">
                        <p>Type: {hoveredSchedule.type}</p>
                        <p>Time: {hoveredSchedule.time}</p>
                        <p>Description: {hoveredSchedule.description}</p>
                    </div>
                )}
            </div>

            <div className="mb-4">
                <h2 className="text-xl font-bold">View Student Schedule</h2>
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        placeholder="Search by NIM"
                        value={searchNIM}
                        onChange={e => setSearchNIM(e.target.value)}
                        className="p-2 border rounded"
                    />
                </div>
                <div className="mt-4">
                    <table className="min-w-full bg-white border text-black">
                        <thead>
                            <tr>
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">NIM</th>
                                <th className="px-4 py-2">Major</th>
                                <th className="px-4 py-2">Schedule</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.bn_number}>
                                    <td className="border px-4 py-2 text-black">{student.name}</td>
                                    <td className="border px-4 py-2 text-black">{student.nim}</td>
                                    <td className="border px-4 py-2 text-black">{student.major}</td>
                                    <td className="border px-4 py-2">
                                        {/* Example schedule data */}
                                        <div
                                            className="bg-red-600 p-2 rounded"
                                            onMouseEnter={() => handleHover({ type: 'Exam', time: '10:00 - 12:00', description: 'Math Exam' })}
                                            onMouseLeave={() => setHoveredSchedule(null)}
                                        >
                                            Exam
                                        </div>
                                        <div
                                            className="bg-amber-500 p-2 rounded mt-2"
                                            onMouseEnter={() => handleHover({ type: 'Proctor', time: '12:00 - 14:00', description: 'Proctoring' })}
                                            onMouseLeave={() => setHoveredSchedule(null)}
                                        >
                                            Proctor
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {hoveredSchedule && (
                    <div className="absolute p-4 bg-white border rounded shadow-lg text-black">
                        <p>Type: {hoveredSchedule.type}</p>
                        <p>Time: {hoveredSchedule.time}</p>
                        <p>Description: {hoveredSchedule.description}</p>
                    </div>
                )}
            </div>

            <div className="mt-8">
                <h2 className="text-lg font-bold">Legend</h2>
                <div className="flex items-center mt-2">
                    <div className="w-4 h-4 bg-red-600 mr-2"></div>
                    <span className="text-black">Exam</span>
                </div>
            <div className="flex items-center mt-2">
                <div className="w-4 h-4 bg-amber-500 mr-2"></div>
                <span className="text-black">Proctor</span>
            </div>
        </div>  
    </div>
);
}