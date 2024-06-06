import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';
import NavBarComponent from '../../../../components/ExamCoordinator/NavBarComponents';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

type Room = {
  room_number_str: string;
  room_capacity: number;
  campus: string;
}

type RoomTransaction = {
  room_number: string;
  shift_id: string;
}

type Shift = {
  shift_id: string;
  start_time: string;
  end_time: string;
}

export default function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [transactions, setTransactions] = useState<RoomTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [shifts, setShifts] = useState<Shift[]>([]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const fetchedRooms = await invoke<Room[]>('get_all_room') as Room[];
        setRooms(fetchedRooms);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };

    fetchRooms();
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (selectedDate && selectedRoom) {
        try {
          const fetchedTransactions = await invoke<RoomTransaction[]>('get_room_transaction', {
            date: selectedDate.toISOString().split('T')[0],
            room_number: selectedRoom,
          }) as RoomTransaction[];
          setTransactions(fetchedTransactions);
        } catch (error) {
          console.error('Error fetching transactions:', error);
        }
      }
    };

    fetchTransactions();
  }, [selectedDate, selectedRoom]);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const fetchedShifts = await invoke<Shift[]>('get_all_shifts') as Shift[];
        setShifts(fetchedShifts);
      } catch (error) {
        console.error('Error fetching shifts:', error);
      }
    };

    fetchShifts();
  }, []);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
  };

  const handleRoomChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRoom(event.target.value);
  };

  const handleTransactionSelect = (transaction: RoomTransaction) => {
    if (selectedTransactions.has(transaction.shift_id)) {
      selectedTransactions.delete(transaction.shift_id);
    } else {
      selectedTransactions.add(transaction.shift_id);
    }
    setSelectedTransactions(new Set(selectedTransactions));
  };

  const filteredRooms = rooms.filter((room) =>
    room.room_number_str.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter((transaction) =>
    selectedTransactions.has(transaction.shift_id)
  );

  return (
    <div>
      <NavBarComponent />
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-2xl font-bold">Room Management</h1>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="w-1/2 mr-4">
              <label htmlFor="search" className="block mb-2 font-bold">
                Search Rooms
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={handleSearch}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="w-1/2">
              <label htmlFor="date" className="block mb-2 font-bold">
                Select Date
              </label>
              <DatePicker
                id="date"
                selected={selectedDate}
                onChange={handleDateChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="w-1/2 mr-4">
              <label htmlFor="room" className="block mb-2 font-bold">
                Select Room
              </label>
              <select
                id="room"
                value={selectedRoom}
                onChange={handleRoomChange}
                className="w-full p-2 border border-gray-300 rounded-md text-black"
              >
                <option value="">All Rooms</option>
                {filteredRooms.map((room) => (
                  <option key={room.room_number_str} value={room.room_number_str}>
                    {room.room_number_str} ({room.room_capacity} seats)
                  </option>
                ))}
              </select>
          </div>
          </div>
          <div className="flex items-center justify-center mb-4">
            <table className="w-full text-left">
                <thead>
                <tr>
                    <th className="px-4 py-2">Room Number</th>
                    <th className="px-4 py-2">Room Capacity</th>
                    <th className="px-4 py-2">Shift ID</th>
                    <th className="px-4 py-2">Start Time</th>
                    <th className="px-4 py-2">End Time</th>
                </tr>
                </thead>
                <tbody>
                {filteredTransactions.map((transaction) => (
                    <tr key={transaction.shift_id}>
                    <td className="border px-4 py-2">{transaction.room_number}</td>
                    <td className="border px-4 py-2">
                        {rooms.find((room) => room.room_number_str === transaction.room_number)?.room_capacity}
                    </td>
                    <td className="border px-4 py-2">{transaction.shift_id}</td>
                    <td className="border px-4 py-2">
                        {shifts.find((shift) => shift.shift_id === transaction.shift_id)?.start_time}
                    </td>
                    <td className="border px-4 py-2">
                        {shifts.find((shift) => shift.shift_id === transaction.shift_id)?.end_time}
                    </td>
                    <td className="border px-4 py-2">
                        <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.shift_id)}
                        onChange={() => handleTransactionSelect(transaction)}
                        className="mr-2"
                        />
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
      </div>
    </div>
  );
}