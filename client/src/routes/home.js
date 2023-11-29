import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const handleNavigate = (blockNumber) => {
    navigate(`/joinRoom/${blockNumber}`);
  };

  return (
    <div>
      <center>
        <h1>Choose code block</h1>
        <p><button onClick={() => handleNavigate('97272752-3e0f-4bcc-8392-fde0fb26f75d')}>block 1</button></p>
        <p><button onClick={() => handleNavigate('1d812931-105d-4bc8-b265-939835937b68')}>block 2</button></p>
        <p><button onClick={() => handleNavigate('2d28a898-2cb2-4e07-9b12-0e55051f007d')}>block 3</button></p>
        <p><button onClick={() => handleNavigate('020126e4-3fb0-478e-86a4-4bfcda27eaab')}>block 4</button></p>
      </center>
    </div>
  );
};

export default Home;
