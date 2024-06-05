import React, { useState, useEffect, SetStateAction } from 'react';
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
        const fetchedRooms = await invoke<Room[]>('get_all_room');
        setRooms(fetchedRooms);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };

    fetchRooms();
  }, []);

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

  useEffect(() => {
    fetchTransactions();
  }, [selectedDate, selectedRoom]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: selectedRoom,
          startDate: selectedDate?.toISOString(),
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Error fetching transactions: ${response.statusText}`);
      }
  
      const transactionsData = await response.json();
      setTransactions(transactionsData);
    } catch (error: any) {
      console.error(`Error fetching transactions: ${(error as Error).message}`);
    }
  };  

  const handleTransactionSelect = (transactionId: string) => {
    setSelectedTransactions((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(transactionId)) {
        newSelected.delete(transactionId);
      } else {
        newSelected.add(transactionId);
      }
      return newSelected;
    });
  };

  const filteredRooms = rooms.filter((room) => {
    const roomNumber = room.room_number_str || '';
    const roomCapacity = room.room_capacity || '';
    const campus = room.campus || '';
    return (
      roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roomCapacity.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      campus.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  function getStartTime(shiftId: string): string {
    const shift = shifts.find((s) => s.shift_id === shiftId);
    return shift ? shift.start_time : '';
  }

  function getEndTime(shiftId: string): string {
    const shift = shifts.find((s) => s.shift_id === shiftId);
    return shift ? shift.end_time : '';
  }

  return (
    <div className='h-screen'>
      <NavBarComponent />
      <div className="container mx-auto py-8 text-black">
        <h1 className="text-2xl font-bold mb-4 text-white">Room Management</h1>
        <div className="mb-4">
          <DatePicker
            selected={selectedDate}
            onChange={(date: SetStateAction<Date | null>) => setSelectedDate(date)}
            dateFormat="yyyy-MM-dd"
            placeholderText="Select a date"
            className="p-2 w-full border rounded text-white"
          />
        </div>
        <div className="mb-4">
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="p-2 w-full border rounded"
          >
            <option value="">All Rooms</option>
            {rooms.map((room) => (
              <option key={room.room_number_str} value={room.room_number_str}>
                {room.room_number_str}
              </option>
            ))}
          </select>
        </div>
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="px-4 py-2">Room Number</th>
              <th className="px-4 py-2">Room Capacity</th>
              <th className="px-4 py-2">Start Time</th>
              <th className="px-4 py-2">End Time</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr
                key={`${transaction.room_number}-${transaction.shift_id}`}
                className={selectedTransactions.has(`${transaction.room_number}-${transaction.shift_id}`) ? 'bg-gray-200' : ''}
                onClick={() => handleTransactionSelect(`${transaction.room_number}-${transaction.shift_id}`)}
              >
                <td className="border px-4 py-2">{transaction.room_number}</td>
                <td className="border px-4 py-2">{filteredRooms.find((room) => room.room_number_str === transaction.room_number)?.room_capacity}</td>
                <td className="border px-4 py-2">{getStartTime(transaction.shift_id)}</td>
                <td className="border px-4 py-2">{getEndTime(transaction.shift_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
