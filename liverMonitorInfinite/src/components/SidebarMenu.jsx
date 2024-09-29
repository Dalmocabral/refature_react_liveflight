import React, { useState, useRef } from 'react';
import MapSession from './MapSession';
import Menulist from './Menulist';
import SessionInfoSidebar from './SessionInfoSidebar';
import UserInfoSidebar from './UserInfoSidebar';
import Logo from './Logo';
import { Layout } from 'antd';
import "./SidebarMenu.css";

const { Sider } = Layout;

const sessions = {
  training: { id: 'c6b11fef-3aaf-475c-9c17-5bf587438f84', name: 'Training Server' },
  casual: { id: 'ef55b332-8847-47eb-8846-e27bdf8a673b', name: 'Casual Server' },
  expert: { id: '99917fd2-bea4-485d-b83e-5094628f33e5', name: 'Expert Server' }
};

export const SidebarMenu = () => {
  const [selectedServer, setSelectedServer] = useState('expert');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [userSidebarVisible, setUserSidebarVisible] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null); // Adiciona o estado para o voo selecionado
  const userSidebarRef = useRef(null);

  const handleSelectServer = (serverKey) => {
    setSelectedServer(serverKey);
  };

  const handleMapIconClick = (flight) => { // Recebe o dado do voo
    setSelectedFlight(flight); // Armazena o voo selecionado
    setUserSidebarVisible(true);
  };

  const handleClickOutside = (event) => {
    if (userSidebarRef.current && !userSidebarRef.current.contains(event.target)) {
      setUserSidebarVisible(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Layout>
      <Sider className='sidebar' collapsed={true} collapsible={false}>
        <Logo />
        <Menulist onSelectServer={handleSelectServer} toggleSidebar={toggleSidebar} />
      </Sider>
      <Layout>
        <div style={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
          {sidebarVisible && (
            <SessionInfoSidebar
              sessionName={sessions[selectedServer].name}
              sessionId={sessions[selectedServer].id}
            />
          )}
          <MapSession sessionId={sessions[selectedServer].id} onIconClick={handleMapIconClick} />
          {userSidebarVisible && selectedFlight && (
            <UserInfoSidebar 
              ref={userSidebarRef} 
              isVisible={userSidebarVisible} 
              flightData={selectedFlight} // Passa os dados do voo selecionado
              sessionId={sessions[selectedServer].id} // Passa o sessionId
            />
          )}
        </div>
      </Layout>
    </Layout>
  );
};

export default SidebarMenu;
