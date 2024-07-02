import { useState, useEffect, useMemo } from 'react';
import './App.css';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { PlayArrow, Stop, Mic, Schedule, Delete } from '@mui/icons-material';
import Slider from '@mui/material/Slider';

import classNames from 'classnames';
import {
  CenterCardUI,
  ConnectedUI,
  MetaUI,
  BackdropUI,
  WrapperUI,
  TrackRowUI,
  TrackSlotUI,
  StopUI,
  RecordUI,
  PlayArrowUI,
  TriggeredUI,
} from './App.css.ts';
import { getRecordingStatus } from './app.utils';
import { Icon } from '@mui/material';

function App() {
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    'ws://localhost:3005/ws'
  );
  const [apiState, setApiState] = useState({});
  const connectionStatus = {
    [ReadyState.CONNECTING]: 'connecting',
    [ReadyState.OPEN]: 'open',
    [ReadyState.CLOSING]: 'closing',
    [ReadyState.CLOSED]: 'closed',
    [ReadyState.UNINSTANTIATED]: 'uninstantiated',
  }[readyState];

  console.log(apiState);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sendToApi = (message: any) => {
    sendMessage(JSON.stringify(message));
  };

  const persistMixPrint = () => sendToApi({ type: 'PERSIST_MIXPRINT' });
  const restoreMixPrint = () => sendToApi({ type: 'RESTORE_MIXPRINT' });
  const toggleClip = (clipSlotId) =>
    sendToApi({
      type: 'TOGGLE_CLIP_SLOT',
      payload: { clipSlotId: '' },
    });
  const goToPreviousGroup = () => sendToApi({ type: 'DECREMENT_GROUP' });
  const goToNextGroup = () => sendToApi({ type: 'INCREMENT_GROUP' });

  useEffect(() => {
    if (!lastMessage?.data) {
      return;
    }

    const newData = JSON.parse(lastMessage.data);
    setApiState(newData);
  }, [lastMessage]);

  const {
    selectedSceneIndex,
    selectedTrackIndex,
    selectedTrackName,
    selectedTrackId,
    selectedGroup,
    isRecording,
    isPlaying,
    metronomeEnabled,
    songTime,
    tempo,
    tracks,
  } = apiState;

  const tracksForSelectedGroup = useMemo(() => {
    if (!selectedGroup || !tracks?.length) {
      return [];
    }

    const renderTracksForGroup = tracks.filter(
      (track) => track.group === selectedGroup
    );

    return renderTracksForGroup;
  }, [selectedGroup, tracks]);

  const renderTracksForSelectedGroup = useMemo(
    () => tracksForSelectedGroup.filter((track) => track.isRender),
    [tracksForSelectedGroup]
  );

  const renderTracks = useMemo(() => {
    return tracks?.filter((track: any) => track.name.includes('r-'));
  }, [tracks]);

  const monitorTracks = useMemo(() => {
    return tracks?.filter((track: any) => !track.name.includes('r-'));
  }, [tracks]);

  if (Object.keys(apiState).length === 0) {
    return null;
  }

  if (connectionStatus === 'closed') {
    return null;
  }

  const handleTempoChange = (event, newValue) => {
    // Update the state or send the new value to the backend
    sendToApi({ type: 'SET_TEMPO', payload: { tempo: newValue } });
  };

  return (
    <BackdropUI
      className={classNames(
        isRecording === 2 && 'count-in',
        isRecording === 1 && 'recording',
        isPlaying && 'playing'
      )}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <Button
          variant={metronomeEnabled ? 'contained' : 'outlined'}
          onClick={() => sendToApi({ type: 'TOGGLE_METRONOME' })}
          style={{ margin: '10px' }}
        >
          <Schedule />
        </Button>
        <div>
          <Slider
            aria-label="Tempo"
            value={tempo}
            onChange={handleTempoChange}
            min={40}
            max={240}
            style={{ width: 150, margin: '10px' }}
          />
        </div>
        <Button
          variant={'contained'}
          onClick={() => sendToApi({ type: 'DELETE_ALL_CLIPS' })}
          style={{ margin: '10px' }}
        >
          <Delete />
        </Button>
      </div>
      <Stack direction="column" spacing={1}>
        <Stack direction="row" spacing={1}>
          {monitorTracks.map((trackToRender: any) => {
            return (
              <Button
                key={trackToRender.id}
                value={Boolean(trackToRender.recordSendEnabled)}
                variant={
                  trackToRender.recordSendEnabled ? 'contained' : 'outlined'
                }
                onClick={() => {
                  sendToApi({
                    type: 'TOGGLE_SEND',
                    payload: {
                      trackKey: trackToRender.name,
                    },
                  });
                }}
              >
                {trackToRender.name}
              </Button>
            );
          })}
        </Stack>

        <TrackRowUI>
          {renderTracks.map((track) => {
            const clipSlot = track?.clipSlots[selectedSceneIndex];

            if (!clipSlot) {
              return 'error';
            }

            const {
              hasClip,
              isPlaying,
              isRecording: isClipRecording,
              isTriggered,
            } = clipSlot;

            console.log(clipSlot);

            const isSelected = track.id === selectedTrackId;

            return (
              <TrackSlotUI
                key={track.id}
                className={classNames(isSelected && 'isSelected')}
                onClick={() => {
                  console.log('hi', clipSlot);
                  sendToApi({
                    type: 'TOGGLE_CLIP',
                    payload: {
                      clipSlotId: clipSlot.id,
                    },
                  });
                }}
              >
                {Boolean(hasClip && !isPlaying) && <PlayArrowUI />}
                {Boolean(hasClip && isPlaying && !isClipRecording) && (
                  <StopUI />
                )}
                {Boolean(!hasClip && isTriggered) && <TriggeredUI />}
                {Boolean(hasClip && isPlaying && isClipRecording) && (
                  <RecordUI />
                )}
              </TrackSlotUI>
            );
          })}
        </TrackRowUI>
        <Stack direction="row">
          <IconButton onClick={() => sendToApi({ type: 'PLAY' })}>
            <PlayArrow />
          </IconButton>
          <IconButton onClick={() => sendToApi({ type: 'STOP' })}>
            <Stop />
          </IconButton>
          <IconButton onClick={() => sendToApi({ type: 'FIRE' })}>
            <Mic />
          </IconButton>
        </Stack>
      </Stack>
      {/* <MetaUI>
        <div>SCENE: {selectedSceneIndex}</div>
        <div>recording: {getRecordingStatus(isRecording)}</div>
        <div>playing: {isPlaying}</div>
        <div>songTime: {songTime}</div>
      </MetaUI> */}
    </BackdropUI>
  );
}

export default App;
