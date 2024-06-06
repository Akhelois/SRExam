import React, { useState, useEffect } from 'react';
import { Button, Table, Modal, Form, Input, message } from 'antd';
import {
  getExamTransactionDetails,
  downloadTransactionCase,
  updateSeat,
  addTimeExtension,
  markCheating,
  manualUploadAnswer,
  downloadStudentAnswer,
  verifyTransaction,
} from './api';

type Student =  {
  nim: string;
  name: string;
  seat: string;
  status: string;
}

type TransactionDetails = {
  subjectCode: string;
  subjectName: string;
  class: string;
  room: string;
  date: string;
  time: string;
  students: Student[];
  notes: string[];
  status: string;
}

type ExamTransactionDetailProps = {
  transaction_id: string;
}

const ExamTransactionDetail: React.FC<ExamTransactionDetailProps> = ({ transaction_id }) => {
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [viewMode, setViewMode] = useState<'seatMapping' | 'studentDetails'>('seatMapping');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [modalType, setModalType] = useState('');
  const [modalForm] = Form.useForm();

  useEffect(() => {
    async function fetchDetails() {
      const details = await getExamTransactionDetails(transaction_id);
      setTransactionDetails(details);
    }
    fetchDetails();
  }, [transaction_id]);

  const handleSeatChange = async (values: { newSeat: string; reason: string }) => {
    if (currentStudent) {
      const { newSeat, reason } = values;
      try {
        await updateSeat(transaction_id, currentStudent.nim, newSeat, reason);
        message.success('Seat updated successfully');
        setModalVisible(false);
        // refresh data
      } catch (error) {
        message.error('Failed to update seat');
      }
    }
  };

  const handleTimeExtension = async (values: { extensionMinutes: number; reason: string }) => {
    const { extensionMinutes, reason } = values;
    try {
      await addTimeExtension(transaction_id, currentStudent ? currentStudent.nim : null, extensionMinutes, reason);
      message.success('Time extension granted');
      setModalVisible(false);
      // refresh data
    } catch (error) {
      message.error('Failed to grant time extension');
    }
  };

  const handleMarkCheating = async (values: { description: string; evidence: File }) => {
    if (currentStudent) {
      const { description, evidence } = values;
      try {
        await markCheating(transaction_id, currentStudent.nim, description, evidence);
        message.success('Cheating marked successfully');
        setModalVisible(false);
        // refresh data
      } catch (error) {
        message.error('Failed to mark cheating');
      }
    }
  };

  const handleManualUpload = async (values: { answerFile: File }) => {
    if (currentStudent) {
      const { answerFile } = values;
      try {
        await manualUploadAnswer(transaction_id, currentStudent.nim, answerFile);
        message.success('Answer uploaded successfully');
        setModalVisible(false);
        // refresh data
      } catch (error) {
        message.error('Failed to upload answer');
      }
    }
  };

  const handleDownloadAnswer = async (nim: string) => {
    try {
      await downloadStudentAnswer(transaction_id, nim);
      message.success('Answer downloaded successfully');
    } catch (error) {
      message.error('Failed to download answer');
    }
  };

  const handleVerifyTransaction = async () => {
    try {
      await verifyTransaction(transaction_id);
      message.success('Transaction verified successfully');
      // refresh data
    } catch (error) {
      message.error('Failed to verify transaction');
    }
  };

  const renderSeatMapping = () => (
    <Table
      dataSource={transactionDetails?.students}
      columns={[
        { title: 'Seat', dataIndex: 'seat', key: 'seat' },
        {
          title: 'Action',
          key: 'action',
          render: (text, record) => (
            <Button
              onClick={() => {
                setCurrentStudent(record);
                setModalType('seatChange');
                setModalVisible(true);
              }}
            >
              Change Seat
            </Button>
          ),
        },
      ]}
    />
  );

  const renderStudentDetails = () => (
    <div>
      <Table
        dataSource={transactionDetails?.students}
        columns={[
          { title: 'No.', dataIndex: 'no', key: 'no' },
          { title: 'Student NIM', dataIndex: 'nim', key: 'nim' },
          { title: 'Student Name', dataIndex: 'name', key: 'name' },
          { title: 'Student Seat', dataIndex: 'seat', key: 'seat' },
          { title: 'Submission Status', dataIndex: 'status', key: 'status' },
          {
            title: 'Time Extension',
            key: 'timeExtension',
            render: (text, record) => (
              <Button
                onClick={() => {
                  setCurrentStudent(record);
                  setModalType('timeExtension');
                  setModalVisible(true);
                }}
              >
                Add Time
              </Button>
            ),
          },
          {
            title: 'Offense',
            key: 'offense',
            render: (text, record) => (
              <Button
                onClick={() => {
                  setCurrentStudent(record);
                  setModalType('markCheating');
                  setModalVisible(true);
                }}
              >
                Mark Cheating
              </Button>
            ),
          },
          {
            title: 'Manual Upload',
            key: 'manualUpload',
            render: (text, record) => (
              <Button
                onClick={() => {
                  setCurrentStudent(record);
                  setModalType('manualUpload');
                  setModalVisible(true);
                }}
              >
                Upload Answer
              </Button>
            ),
          },
          {
            title: 'Download Answer',
            key: 'downloadAnswer',
            render: (text, record) => <Button onClick={() => handleDownloadAnswer(record.nim)}>Download Answer</Button>,
          },
        ]}
      />
      <Form layout="inline" onFinish={handleTimeExtension}>
        <Form.Item name="extensionMinutes" label="Extension Minutes">
          <Input type="number" max={20} />
        </Form.Item>
        <Form.Item name="reason" label="Reason">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Give Time Extension
          </Button>
        </Form.Item>
      </Form>
      <div>
        <h3>Transaction Notes</h3>
        {transactionDetails?.notes.map((note, index) => (
          <p key={index}>{note}</p>
        ))}
        <Form layout="vertical" onFinish={(values) => {
          // add transaction note
        }}>
          <Form.Item name="note" label="Add Note">
            <Input.TextArea />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add Note
            </Button>
          </Form.Item>
        </Form>
      </div>
      <Button type="primary" onClick={handleVerifyTransaction}>
        Verify Transaction
      </Button>
    </div>
  );

  const renderModalContent = () => {
    switch (modalType) {
      case 'seatChange':
        return (
          <Form form={modalForm} layout="vertical" onFinish={handleSeatChange}>
            <Form.Item name="newSeat" label="New Seat">
              <Input />
            </Form.Item>
            <Form.Item name="reason" label="Reason">
              <Input />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Form.Item>
          </Form>
        );
      case 'timeExtension':
        return (
          <Form form={modalForm} layout="vertical" onFinish={handleTimeExtension}>
            <Form.Item name="extensionMinutes" label="Extension Minutes">
              <Input type="number" max={20} />
            </Form.Item>
            <Form.Item name="reason" label="Reason">
              <Input />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Form.Item>
          </Form>
        );
      case 'markCheating':
        return (
          <Form form={modalForm} layout="vertical" onFinish={handleMarkCheating}>
            <Form.Item name="description" label="Description">
              <Input.TextArea />
            </Form.Item>
            <Form.Item name="evidence" label="Evidence">
              <Input type="file" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Form.Item>
          </Form>
        );
      case 'manualUpload':
        return (
          <Form form={modalForm} layout="vertical" onFinish={handleManualUpload}>
            <Form.Item name="answerFile" label="Answer File">
              <Input type="file" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Form.Item>
          </Form>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <Button onClick={() => setViewMode('seatMapping')}>Seat Mapping</Button>
      <Button onClick={() => setViewMode('studentDetails')}>Student Details</Button>
      {viewMode === 'seatMapping' ? renderSeatMapping() : renderStudentDetails()}
      <Modal visible={modalVisible} onCancel={() => setModalVisible(false)} footer={null}>
        {renderModalContent()}
      </Modal>
    </div>
  );
};

export default ExamTransactionDetail;