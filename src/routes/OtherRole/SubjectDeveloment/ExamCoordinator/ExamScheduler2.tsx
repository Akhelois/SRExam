import React, { useState, useEffect } from 'react';
import Select, { SingleValue } from 'react-select';
import { invoke } from '@tauri-apps/api/tauri';
import NavbarComponent from '../../../../components/ExamCoordinator/NavBarComponents';

type ExamTransaction = {
  transaction_id: string;
  subject_code: string;
  room_number: string;
  shift_id: string;
  transaction_date: string;
  proctor?: string | null;
  status?: string | null;
};

type User = {
  bn_number: string;
  nim: string;
  name: string;
  major: string;
  role: string;
  initial?: string;
};

interface OptionType {
  value: ExamTransaction;
  label: string;
}

const ExamScheduler2: React.FC = () => {
  const [examTransactions, setExamTransactions] = useState<ExamTransaction[]>([]);
  const [selectedExamTransaction, setSelectedExamTransaction] = useState<OptionType | null>(null);
  const [assistants, setAssistants] = useState<{ value: string; label: string }[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<{ value: string; label: string } | null>(null);

  useEffect(() => {
    const fetchExamTransactions = async () => {
      try {
        const examTransactionsResult: ExamTransaction[] = await invoke('get_exam_transaction');
        setExamTransactions(examTransactionsResult);
      } catch (error) {
        console.error('Failed to fetch exam transactions:', error);
      }
    };

    fetchExamTransactions();
  }, []);

  useEffect(() => {
    const fetchAssistants = async () => {
      try {
        const users: User[] = await invoke('get_all_users');
        const assistantsResult = users
          .filter(user => user.role === 'Assistant')
          .map(user => ({
            value: user.bn_number,
            label: user.initial || user.name
          }));
        setAssistants(assistantsResult);
      } catch (error) {
        console.error('Failed to fetch assistants:', error);
      }
    };

    fetchAssistants();
  }, []);

  const options: OptionType[] = examTransactions.map(transaction => ({
    value: transaction,
    label: `${transaction.transaction_id} - ${transaction.subject_code}`,
  }));

  const handleSelectExamTransaction = (selectedOption: SingleValue<OptionType>) => {
    setSelectedExamTransaction(selectedOption);
  };

  const handleSelectAssistant = (selectedOption: { value: string; label: string } | null) => {
    setSelectedAssistant(selectedOption);
  };

  const handleAssignAssistant = async () => {
    try {
      if (selectedExamTransaction && selectedAssistant) {
        await invoke('update_exam_transaction', {
          transactionId: selectedExamTransaction.value.transaction_id,
          proctor: selectedAssistant.value,
          status: 'ongoing',
        });
        console.log('Assistant assigned successfully!');
      } else {
        console.error('No exam transaction or assistant selected.');
      }
    } catch (error) {
      console.error('Failed to assign assistant:', error);
    }
  };

  return (
    <div>
      <NavbarComponent />
      <h1>Exam Assistant Assignment</h1>
      <div className="text-black">
        <h2>Select Exam Transaction</h2>
        <Select
            value={selectedExamTransaction}
            onChange={handleSelectExamTransaction}
            options={options}
            isClearable
            placeholder="Select an exam transaction"
            className="w-100"
            getOptionLabel={(option: OptionType) => option.label}
            getOptionValue={(option: OptionType) => option.value.transaction_id}
        />
        <h2>Select Assistant</h2>
        <Select
          value={selectedAssistant}
          onChange={handleSelectAssistant}
          options={assistants}
          isClearable
          placeholder="Select an assistant"
          className="w-100 text-black"
        />
        <button className="btn btn-primary p-2 w-50" onClick={handleAssignAssistant} disabled={!selectedExamTransaction || !selectedAssistant}>
          Assign Assistant
        </button>
      </div>
    </div>
  );
};

export default ExamScheduler2;