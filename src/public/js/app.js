const socket = io();

const call = document.getElementById("call");
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const h2MyHP = document.getElementById("myHP");


call.hidden = true;

/**
 * @type MediaStream
 */
let myStream;
let muted = false;
let cameraOff = false;
let peerDict = {};  // 자신과 연결된 상대의 socket.id에 대한 hp Element 저장
let myHP = 100

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log(devices);
    const cameras = devices.filter((device) => device.kind === "videoinput");
    console.log(cameras);
    const currentCamera = myStream.getVideoTracks()[0];
    console.log(currentCamera);
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) cameras.value = camera.deviceId;
      camerasSelect.append(option);
    });
  } catch (e) {
    console.log(e);
  }
}

async function getMedia(deviceId) {
  try {
    myStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: deviceId ? { deviceId } : true,
    });
    console.log(myStream);
    faceapi.nets.tinyFaceDetector.loadFromUri('/public/models')
    faceapi.nets.faceExpressionNet.loadFromUri('/public/models')
    myFace.srcObject = myStream;
    if (!deviceId) {
      getCameras();
    }
    setMute(true);
  } catch (e) {
    alert(e);
    console.log(e);
  }
}

function setMute(mute) {
  const audioTracks = myStream.getAudioTracks();
  console.log(audioTracks);
  if (mute) {
    muteBtn.innerText = "UnMute";
    muted = true;
    audioTracks.forEach((track) => (track.enabled = false));
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
    audioTracks.forEach((track) => (track.enabled = true));
  }
}
function handleMuteClick() {
  setMute(!muted);
}
function handleMuteCameraClick() {
  const cameraTracks = myStream.getVideoTracks();
  console.log(cameraTracks);
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
    cameraTracks.forEach((track) => (track.enabled = true));
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
    cameraTracks.forEach((track) => (track.enabled = false));
  }
}
async function handleCameraChange() {
  await getMedia(cameras.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}
muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleMuteCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
let room = "";
/**
 * @type RTCPeerConnection[]
 */
let peerConnections = {};

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = document.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value, socket.id);
  room = input.value;
  input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// socket code

socket.on("welcome", async (newbieID) => {
  // 뉴비를 위해 새로운 커넥션을 만들고
  const offer = await makeConnection(newbieID);
  console.log("someone joined");
  // 뉴비에게 내 정보와 offer를 전달한다.
  socket.emit("offer", offer, room, newbieID, socket.id);
  console.log("send the offer");
});
socket.on("leave", (leaveId) => {
  const video = document.getElementById(leaveId);
  video.remove();
});
socket.on("offer", async (offer, offersId) => {
  console.log("receive the offer");
  console.log(offer);
  // 뉴비는 현재 방안에 있던 모든사람의 offer를 받아 새로운 커넥션을 만들고, 답장을 만든다.
  const answer = await makeConnection(offersId, offer);
  // 답장을 현재 있는 받은 커넥션들에게 각각 보내준다.
  socket.emit("answer", answer, offersId, socket.id);
  console.log("send the answer");
});
socket.on("answer", async (answer, newbieID) => {
  console.log("receive the answer", newbieID);
  // 방에 있던 사람들은 뉴비를 위해 생성한 커섹션에 answer를 추가한다.
  peerConnections[newbieID].setRemoteDescription(answer);
});
socket.on("ice", (ice, othersId) => {
  console.log("receive candidate");
  /** 다른 사람에게서 받은 ice candidate를 각 커넥션에 넣는다. */
  peerConnections[othersId].addIceCandidate(ice);
});
socket.on("smile", (peerHp, peerId) => {
  const h2 = peerDict[peerId];
  h2.innerText = `HP : ${peerHp}`;
})

// RTC Code
async function makeConnection(othersId, _offer) {
  const myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
          "stun:stun01.sipphone.com",
          "stun:stun.ekiga.net",
          "stun:stun.fwdnet.net",
          "stun:stun.ideasip.com",
          "stun:stun.iptel.org",
          "stun:stun.rixtelecom.se",
          "stun:stun.schlund.de",
          "stun:stunserver.org",
          "stun:stun.softjoys.com",
          "stun:stun.voiparound.com",
          "stun:stun.voipbuster.com",
          "stun:stun.voipstunt.com",
          "stun:stun.voxgratia.org",
          "stun:stun.xten.com",
        ],
      },
    ],
  });
  peerConnections[othersId] = myPeerConnection;

  myPeerConnection.addEventListener("icecandidate", (data) =>
    handleIce(data, othersId)
  );
  myPeerConnection.addEventListener("addstream", (data) =>
    handleAddStream(data, othersId)
  );
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));

  let offer = _offer;
  let answer;
  if (!offer) {
    offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
  } else {
    myPeerConnection.setRemoteDescription(offer);
    answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
  }

  return answer || offer;
}

/**
 *
 * @param {RTCPeerConnectionIceEvent} data
 */
function handleIce(data, othersId) {
  // ice breack가 생기면? 이를 해당 사람들에게 전달한다.
  console.log("got ice candidate");
  socket.emit("ice", data.candidate, room, othersId, socket.id);
  console.log("send ice candidate");
}

/**
 *
 * @param {MediaStreamEvent} data
 */
function handleAddStream(data, othersId) {
  console.log("got an stream from my peer");
  // stream을 받아오면, 비디오를 새로 생성하고 넣어준다.
  const h2 = document.createElement("h2");
  const video = document.createElement("video");
  document.getElementById("othersStream").appendChild(h2);
  document.getElementById("othersStream").appendChild(video);
  h2.innerText = "Now Loading..."
  peerDict[othersId] = h2;
  video.id = othersId;
  video.autoplay = true;
  video.playsInline = true;
  video.style.backgroundColor = "blue";
  video.width = 400;
  video.height = 400;
  video.srcObject = data.stream;
}


function handleHP(happiness) {
  if (myHP > 0) { // 아직 살아 있으면
    if (happiness > 0.2) { // 피를 깎아야 하는 경우
      if (happiness > 0.6) {
        myHP -= 1;
      } else {
        myHP -= 0.5;
      }
    }
    console.log("HP :", myHP);
    h2MyHP.innerText = `My HP : ${myHP}`;
    socket.emit("smile", myHP, room, socket.id);
  } else { // 죽었으면
    console.log("Game Over!!");
    h2MyHP.innerText = `Game Over!!`;
    socket.emit("gameOver", socket.id);
  }
}


myFace.addEventListener('play', () => { // 이 함수는 한 번만 실행
    const canvas = faceapi.createCanvasFromMedia(myFace)
    document.body.append(canvas)
    const displaySize = { width: myFace.width, height: myFace.height }
    faceapi.matchDimensions(canvas, displaySize)
    setInterval(async () => { // 이 함수는 N[ms]마다 실행
      const detections = await faceapi.detectAllFaces(myFace, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions() // 모든 얼굴 감지 -> detectSingleFace 사용 고려해보기
      // const resizedDetections = faceapi.resizeResults(detections, displaySize)
      // canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height) // 그렸던 내용을 지워준다고 함.
      // faceapi.draw.drawDetections(canvas, resizedDetections)
      // faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
      
      if (detections[0]) { // 얼굴이 감지된 경우에만
        handleHP(detections[0].expressions.happy);
      }

    }, 1000) // 마지막 인자로 얼굴 인식 주기 설정(ms)
  })