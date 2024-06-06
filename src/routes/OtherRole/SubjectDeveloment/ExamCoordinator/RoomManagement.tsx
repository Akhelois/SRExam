import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';
import NavBarComponent from '../../../../components/ExamCoordinator/NavBarComponents';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Tooltip from 'react-tooltip';

// Define the types and components

export default function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [transactions, setTransactions] = useState<RoomTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [shifts, setShifts] = useState<Shift[]>([]);

  useEffect(() => {
    // Fetch rooms
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
  
  // Fetch transactions based on selectedDate and selectedRoom
  
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
    // Fetch shifts
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

  // Handle search, date change, room change, transaction selection
  
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

  // Filter rooms based on search term
  
  const filteredRooms = rooms.filter((room) =>
    room.room_number_str.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <NavBarComponent />
      <div className="flex flex-col items-center justify-center h-screen">
        {/* Search and date selection */}
        <div className="w-full max-w-4xl p-4 bg-white rounded-lg shadow-md text-black">
          {/* Search */}
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full px-4 py-2 border rounded-md"
          />
          {/* Date Picker */}
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="yyyy-MM-dd"
            className="w-full px-4 py-2 border rounded-md mt-4"
          />
        </div>
        
        {/* Room Selection */}
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

        {/* Transaction Table */}
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
                  <td className="px-4 py-2 border">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.shift_id}
                        className={`cursor-pointer ${
                          transaction.room_number === room.room_number_str &&
                          selectedTransactions.has(transaction.shift_id)
                            ? 'bg-red-500 text-white'
                            : ''
                        }`}
                        title={
                          transaction.room_number === room.room_number_str &&
                          `Shift ID: ${transaction.shift_id}`
                        }
                        onClick={() => handleTransactionSelect(transaction)}
                        data-tip
                        data-for={`tooltip-${transaction.shift_id}`}
                      >
                        {transaction.room_number === room.room_number_str && (
                          <span>{transaction.shift_id}</span>
                        )}
                      </div>
                    ))}
                    {transactions.map((transaction) => (
                      <Tooltip
                        key={transaction.shift_id}
                        id={`tooltip-${transaction.shift_id}`}
                        effect="solid"
                      >
                        {transaction.room_number === room.room_number_str && (
                          <span>{`Start Time: ${transaction.start_time} - End Time: ${transaction.end_time}`}</span>
                        )}
                      </Tooltip>
                    ))}
                  </td>
                  <td className="px-4 py-2 border"></td>
                  <td className="px-4 py-2 border"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}