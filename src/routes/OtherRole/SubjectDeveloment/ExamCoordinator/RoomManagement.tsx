import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';
import NavBarComponent from "../../../../components/ExamCoordinator/NavBarComponents";

type Room = {
    room_number_str: string;
    room_capacity: string;
    campus: string;
};  

export default function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
        try {
          const fetchedRooms = await invoke<Room[]>('get_all_room');
          console.log('Fetched rooms:', fetchedRooms);
          setRooms(fetchedRooms);
        } catch (error) {
          console.error('Error fetching rooms:', error);
        }
    };

    fetchData();
  }, []);

  const filteredRooms = rooms.filter((room) => {
    const roomNumber = room.room_number_str || '';
    const roomCapacity = room.room_capacity || '';
    const campus = room.campus || '';
    return (
      roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roomCapacity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campus.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className='h-screen'>
      <NavBarComponent />
      <div className="container mx-auto py-8 text-black">
        <h1 className="text-2xl font-bold mb-4 text-white">Room Management</h1>
        <div className="mb-4 text-white">
          <input
            type="text"
            placeholder="Search by room number, capacity, or campus"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 w-100 border rounded"
          />
        </div>
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="px-4 py-2">Room Number</th>
              <th className="px-4 py-2">Room Capacity</th>
              <th className="px-4 py-2">Campus</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.map((room: Room, index) => (
                <tr key={index}>
                <td className="border px-4 py-2">{room.room_number_str}</td>
                <td className="border px-4 py-2">{room.room_capacity}</td>
                <td className="border px-4 py-2">{room.campus}</td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}