import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import NavbarComponent from '../../../../components/ExamCoordinator/NavBarComponents';
import Select from 'react-select';

type Enrollment = {
  class_code: string;
  nim: string;
  subject_code: string;
  subject_name: string;
};

export default function ExamScheduler(): JSX.Element {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const enrollmentsResult: Enrollment[] = await invoke('get_all_enrollment');
        setEnrollments(enrollmentsResult);

        const subjectsMap = new Map<string, { value: string; label: string }>();
        enrollmentsResult.forEach(enrollment => {
          subjectsMap.set(enrollment.subject_code, {
            value: enrollment.subject_code,
            label: `${enrollment.subject_code} - ${enrollment.subject_name}`
          });
        });

        const subjectsResult = Array.from(subjectsMap.values());
        setSubjects(subjectsResult);
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };

    fetchData();
  }, []);

  const handleSelectSubject = (selectedOption: { value: string; label: string } | null) => {
    setSelectedSubject(selectedOption ? selectedOption.value : null);
  };

  return (
    <div>
      <NavbarComponent />
      <h1>Exam Scheduler</h1>
      <div className="text-black">
        <h2>Choose Subject</h2>
        <Select
          value={subjects.find(option => option.value === selectedSubject)}
          onChange={handleSelectSubject}
          options={subjects}
          isClearable
          placeholder="Select a subject"
          className="w-100"
        />
      </div>
      {selectedSubject && (
        <div>
          <h2>Exam Transactions</h2>
          <ul>
            {enrollments
              .filter((enrollment: Enrollment) => enrollment.subject_code === selectedSubject)
              .map((enrollment: Enrollment) => (
                <li key={enrollment.nim}>
                  {enrollment.subject_code} - {enrollment.class_code} - {enrollment.subject_name}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
