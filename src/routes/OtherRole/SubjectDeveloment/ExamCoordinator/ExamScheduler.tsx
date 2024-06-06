import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import NavbarComponent from '../../../../components/ExamCoordinator/NavBarComponents';
import Select from 'react-select';

type Enrollment = {
  class_code_str: string;
  nim: string;
  subject_code: string;
};

type Subject = {
  subject_code_str: string;
  subject_name: string;
};

type Room = {
  room_number_str: string;
  room_capacity: string;
  campus: string;
};

type Shift = {
  shift_id: string;
  start_time: string;
  end_time: string;
};

type ExamTransaction = {
  transaction_id: string;
  subject_code_str: string;
  room_number_str: string;
  shift_id: string;
  transaction_date: string;
  transaction_time: string;
  seat_number: string;
  status: string;
};

export default function ExamScheduler(): JSX.Element {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<{ value: string; label: string }[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const enrollmentsResult: Enrollment[] = await invoke('get_all_enrollment');
        setEnrollments(enrollmentsResult);

        const subjectsResult: Subject[] = await invoke('get_all_subject');
        const mappedSubjects = subjectsResult.map(subject => ({
          value: subject.subject_code_str,
          label: `${subject.subject_code_str} - ${subject.subject_name}`,
        }));
        setSubjects(mappedSubjects);

        const roomsResult: Room[] = await invoke('get_all_room');
        setRooms(roomsResult);

        const shiftsResult: Shift[] = await invoke('get_all_shifts');
        setShifts(shiftsResult);
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };

    fetchData();
  }, []);

  const handleSelectSubject = (selectedOption: { value: string; label: string } | null) => {
    setSelectedSubject(selectedOption ? selectedOption.value : null);
    setSelectedClasses([]);
  };

  const handleSelectClass = (classCode: string) => {
    if (selectedClasses.includes(classCode)) {
      setSelectedClasses(selectedClasses.filter(code => code !== classCode));
    } else {
      setSelectedClasses([...selectedClasses, classCode]);
    }
  };

  const handleSubmit = async () => {
    try {
      await invoke('insert_exam_transaction', {
        subjectCodeStr: selectedSubject,
        roomNumberStr: selectedRoom,
        shiftId: selectedShift,
        transactionDate: selectedDate,
      });
      console.log('Exam transaction inserted successfully!');
    } catch (error) {
      console.error('Failed to insert exam transaction:', error);
    }
  };

  return (
    <div>
      <NavbarComponent />
      <h1>Exam Scheduler</h1>
      <div className="text-black">
        <h2 className='text-white'>Choose Subject</h2>
        {subjects.length > 0 ? (
          <Select
            value={subjects.find(option => option.value === selectedSubject)}
            onChange={handleSelectSubject}
            options={subjects}
            isClearable
            placeholder="Select a subject"
            className="w-100"
          />
        ) : (
          <p>Loading subjects...</p>
        )}
      </div>
      {selectedSubject && (
        <div>
          <h2>Class Codes for {selectedSubject}</h2>
          <ul>
            {enrollments
              .filter((enrollment: Enrollment) => enrollment.subject_code === selectedSubject)
              .map((enrollment: Enrollment) => (
                <li key={enrollment.class_code_str}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(enrollment.class_code_str)}
                      onChange={() => handleSelectClass(enrollment.class_code_str)}
                    />
                    {enrollment.class_code_str}
                  </label>
                </li>
              ))}
          </ul>
        </div>
      )}
      {selectedClasses.length > 0 && (
        <div>
          <h2>Select Date</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
          <h2>Select Room</h2>
          <Select
            value={selectedRoom ? { value: selectedRoom, label: selectedRoom } : null}
            onChange={(selectedOption: { value: string; label: string } | null) =>
              setSelectedRoom(selectedOption?.value ?? '')
            }
            options={rooms.map(room => ({
              value: room.room_number_str,
              label: `${room.room_number_str} - Capacity: ${room.room_capacity}, Campus: ${room.campus}`,
            }))}
            isClearable
            placeholder="Select a room"
            className="w-100 text-black"
          />
          <h2>Select Shift</h2>
          <Select
            value={selectedShift ? { value: selectedShift, label: selectedShift } : null}
            onChange={(selectedOption: { value: string; label: string } | null) =>
              setSelectedShift(selectedOption?.value ?? '')
            }
            options={shifts.map(shift => ({
              value: shift.shift_id,
              label: `${shift.shift_id} - ${shift.start_time} to ${shift.end_time}`,
            }))}
            isClearable
            placeholder="Select a shift"
            className="w-100 text-black"
          />
          <button className="btn btn-primary p-2 w-50" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      )}
    </div>
  );
}