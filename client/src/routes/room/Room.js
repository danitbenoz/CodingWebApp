import { useEffect, useState } from "react";
import AceEditor from "react-ace";
import { Toaster, toast } from 'react-hot-toast';
import { useNavigate, useParams } from "react-router-dom";
import { generateColor } from "../../utils";
import { useMemo } from 'react';

import './Room.css'

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/mode-golang";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/keybinding-emacs";
import "ace-builds/src-noconflict/keybinding-vim";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/ext-searchbox";

export default function Room({ socket }) {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const [fetchedUsers, setFetchedUsers] = useState(() => [])
  const [fetchedCode, setFetchedCode] = useState(() => "")
  const [language, setLanguage] = useState(() => "javascript")
  const [isFirstUser, setIsFirstUser] = useState(false);

  const userReadonlyMap = useMemo(() => new Map(), []); 

  const languagesAvailable = ["javascript"]

const [currentCode, setCurrentCode] = useState(() => ""); //stores the current code

  // New state to hold the initial code fetched from the database
  const [initialCode, setInitialCode] = useState(() => "");

const saveCode = async () => {
  try {
    const response = await fetch('http://localhost:5000/saveCode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId, code: currentCode }), // Use the current code from state
    });

    const data = await response.json();
    if (data.success) {
      toast.success('Code saved successfully.');
    } else {
      toast.error('Failed to save code.');
    }
  } catch (error) {
    console.error('Error saving code:', error);
    toast.error('Failed to save code. Please try again.');
  }
};


  const fetchCode = async () => {
    try {
      const response = await fetch(`http://localhost:5000/getCode/${roomId}`);
      const data = await response.json();

      if (data.success) {
        setInitialCode(data.code);
        setFetchedCode(data.code);
        setCurrentCode(data.code);

      } else {
        console.error('Failed to fetch code:', data.message);
      }
    } catch (error) {
      console.error('Error fetching code:', error);
    }
  };



  function onChange(newValue) {
    setFetchedCode(newValue)
    setCurrentCode(newValue)
    socket.emit("update code", { roomId, code: newValue })
    socket.emit("syncing the code", { roomId: roomId })
  }

  function handleLanguageChange(e) {
    setLanguage(e.target.value)
    socket.emit("update language", { roomId, languageUsed: e.target.value })
    socket.emit("syncing the language", { roomId: roomId })
  }

  function handleLeave() {
    socket.disconnect()
    !socket.connected && navigate('/', { replace: true, state: {} })
  }

  const getTitleForRoomId = (roomId) => {
    const titleMap = {
      "97272752-3e0f-4bcc-8392-fde0fb26f75d": "Block number 1",
      "1d812931-105d-4bc8-b265-939835937b68": "Block number 2",
      "2d28a898-2cb2-4e07-9b12-0e55051f007d": "Block number 3",
      "020126e4-3fb0-478e-86a4-4bfcda27eaab": "Block number 4",
    };

    return titleMap[roomId] || "Default Title"; // Default title for other room IDs
  };

  useEffect(() => {

    const fetchInitialCode = async () => {
      // Fetch the initial code when the component mounts
      await fetchCode();
    };
  
    fetchInitialCode();

    socket.on("updating client list", ({ userslist }) => {
      setFetchedUsers(userslist);
    });
  
    socket.on("on language change", ({ languageUsed }) => {
      setLanguage(languageUsed);
    });
  
    socket.on("on code change", ({ code }) => {
      setFetchedCode(code);
    });
  
    socket.on("new member joined", ({ username }) => {
      if (!isFirstUser) {
        userReadonlyMap.set(username, true);
        setIsFirstUser(true);
      } else {
        userReadonlyMap.set(username, false);
      }
      toast(`${username} joined`);
    });
  
    socket.on("member left", ({ username }) => {
      toast(`${username} left`);
      const currentFirstUser = Array.from(userReadonlyMap.keys())[0];
  
      if (currentFirstUser) {
        userReadonlyMap.set(currentFirstUser, true);
        setIsFirstUser(true);
      } else {
        setIsFirstUser(false);
      }
    });
  
    const backButtonEventListner = window.addEventListener("popstate", function (e) {
      const eventStateObj = e.state;
      if (!('usr' in eventStateObj) || !('username' in eventStateObj.usr)) {
        socket.disconnect();
      }
    });

    return () => {
      window.removeEventListener("popstate", backButtonEventListner);
    };
  }, [isFirstUser, socket,userReadonlyMap,roomId]);

  useEffect(() => {
    setInitialCode(fetchedCode);
  }, [fetchedCode, roomId]);
  

  return (
    <><div className="title">
      <center><p>{getTitleForRoomId(roomId)}</p></center>
    </div><div className="room">
        <div className="roomSidebar">
          <div className="roomSidebarUsersWrapper">
            <div className="languageFieldWrapper">
              <select className="languageField" name="language" id="language" value={language} onChange={handleLanguageChange}>
                {languagesAvailable.map(eachLanguage => (
                  <option key={eachLanguage} value={eachLanguage}>{eachLanguage}</option>
                ))}
              </select>
            </div>

          
            <div className="roomSidebarUsers">
              <p>Connected Users:</p>
              {fetchedUsers.map((each) => (
                <div key={each} className="roomSidebarUsersEach">
                  <div className="roomSidebarUsersEachAvatar" style={{ backgroundColor: `${generateColor(each)}` }}>{each.slice(0, 2).toUpperCase()}</div>
                  <div className="roomSidebarUsersEachName">{each}</div>
                </div>
              ))}
            </div>
          </div>
          <button className="roomSidebarBtn" onClick={saveCode}>save</button>

          <button className="roomSidebarBtn" onClick={() => {
            handleLeave();
          } }>Leave</button>
        </div>

        <AceEditor
          placeholder="Write your code here."
          className="roomCodeEditor"
          mode={language}
          theme="monokai"
          name="collabEditor"
          width="auto"
          height="auto"
          value={fetchedCode}
          onChange={onChange}
          fontSize={15}
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          enableLiveAutocompletion={true}
          enableBasicAutocompletion={false}
          enableSnippets={false}
          wrapEnabled={true}
          readOnly={isFirstUser}
          tabSize={2}
          editorProps={{
            $blockScrolling: true
          }} />
        <Toaster />
      </div></>
  )
}