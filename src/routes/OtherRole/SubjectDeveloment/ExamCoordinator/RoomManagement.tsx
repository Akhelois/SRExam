import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';
import NavBarComponent from '../../../../components/ExamCoordinator/NavBarComponents';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Tooltip } from 'antd'; // Import Tooltip from antd

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
        const fetchedRooms = await invoke<Room[]>('get_all_room');
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
            date: selectedDate?.toISOString().split('T')[0] || '',
            room_number: selectedRoom,
          });
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
        const fetchedShifts = await invoke<Shift[]>('get_all_shifts');
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
    const updatedTransactions = new Set(selectedTransactions);
    if (updatedTransactions.has(transaction.shift_id)) {
      updatedTransactions.delete(transaction.shift_id);
    } else {
      updatedTransactions.add(transaction.shift_id);
    }
    setSelectedTransactions(updatedTransactions);
  };

  const filteredRooms = rooms.filter((room) =>
    room.room_number_str.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <NavBarComponent />
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="w-full max-w-4xl p-4 bg-white rounded-lg shadow-md text-black">
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full px-4 py-2 border rounded-md"
          />
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="yyyy-MM-dd"
            className="w-full px-4 py-2 border rounded-md mt-4"
          />
        </div>
        
        <div className="w-full max-w-4xl p-4 bg-white rounded-lg shadow-md text-black mt-4 overflow-x-auto">
          <select
            value={selectedRoom}
            onChange={handleRoomChange}
            className="w-full px-4 py-2 border rounded-md"
          >
            <option value="">Select Room</option>
            {rooms.map((room) => (
              <option key={room.room_number_str} value={room.room_number_str}>
                {room.room_number_str}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full max-w-4xl p-4 bg-white rounded-lg shadow-md text-black mt-4 overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead>
              <tr>
                <th className="px-4 py-2 border">Room Number</th>
                <th className="px-4 py-2 border">Room Capacity</th>
                <th className="px-4 py-2 border">Transaction ID</th>
                <th className="px-4 py-2 border">Start Time</th>
                <th className="px-4 py-2 border">End Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => (
                <tr key={room.room_number_str}>
                  <td className="px-4 py-2 border">{room.room_number_str}</td>
                  <td className="px-4 py-2 border">{room.room_capacity}</td>
                  <td className="
