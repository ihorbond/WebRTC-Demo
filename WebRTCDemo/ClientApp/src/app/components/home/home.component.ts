import { Component, ViewChild, ElementRef, Renderer2, AfterViewInit, OnInit } from '@angular/core';
import adapter from 'webrtc-adapter';

const mediaStreamConstraints: MediaStreamConstraints = {
  video: true,
  audio: true
};

const offerOptions: RTCOfferOptions = {
  offerToReceiveVideo: true
};

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit, AfterViewInit {
  @ViewChild('localVideo') localVideo: ElementRef;
  @ViewChild('remoteVideo') remoteVideo: ElementRef;

  private localStream: MediaStream;
  private remoteStream: MediaStream;

  private localVideoPlayer: HTMLVideoElement;
  private remoteVideoPlayer: HTMLVideoElement;

  private localPeerConnection: RTCPeerConnection;
  private remotePeerConnection: RTCPeerConnection;

  constructor(private _renderer: Renderer2) { }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.localVideoPlayer = this._renderer.selectRootElement(this.localVideo.nativeElement);
    this.localVideoPlayer.muted = false;
    //this.localVideoPlayer.controls = true;

    this.remoteVideoPlayer = this._renderer.selectRootElement(this.remoteVideo.nativeElement);
    this.localVideoPlayer.muted = false;
  }

  public start(): void {
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
      .then((stream: MediaStream) => {
        this.localStream = stream;
        this.localVideoPlayer.srcObject = stream;
        this.trace('Received local stream');
      })
      .catch((err: any) => {
        this.trace(`navigator.getUserMedia error: ${err.toString()}.`);
        alert(err);
      });
  }

  public call(): void {
    this.trace('Starting call.');

    // Get local media stream tracks.
    const videoTracks = this.localStream.getVideoTracks();
    const audioTracks = this.localStream.getAudioTracks();
    if (videoTracks.length > 0) {
      this.trace(`Using video device: ${videoTracks[0].label}.`);
    }
    if (audioTracks.length > 0) {
      this.trace(`Using audio device: ${audioTracks[0].label}.`);
    }

    // Create peer connections and add behavior.
    this.localPeerConnection = new RTCPeerConnection(null);
    this.trace('Created local peer connection object localPeerConnection.');

    this.localPeerConnection.addEventListener('icecandidate', this.handleConnection.bind(this));
    this.localPeerConnection.addEventListener('iceconnectionstatechange', this.handleConnectionChange.bind(this));

    this.remotePeerConnection = new RTCPeerConnection(null);
    this.trace('Created remote peer connection object remotePeerConnection.');

    this.remotePeerConnection.addEventListener('icecandidate', this.handleConnection.bind(this));
    this.remotePeerConnection.addEventListener('iceconnectionstatechange', this.handleConnectionChange.bind(this));
    this.remotePeerConnection.addEventListener('addstream', this.setRemoteMediaStream.bind(this));

    // Add local tracks to peer connection
    let localTracks = this.localStream.getTracks();
    localTracks.forEach(x => this.localPeerConnection.addTrack(x, this.localStream));
    this.trace('Added local stream to localPeerConnection.');

    this.trace('localPeerConnection createOffer start.');
    this.localPeerConnection.createOffer(offerOptions)
      .then(this.createdOffer.bind(this))
      .catch(this.setSessionDescriptionError.bind(this));
  }

  public hangUp(): void {

  }

  // Logs offer creation and sets peer connection session descriptions.
  private createdOffer(description: RTCSessionDescription): void {
    this.trace(`Offer from localPeerConnection:\n${description.sdp}`);

    this.trace('localPeerConnection setLocalDescription start.');
    this.localPeerConnection.setLocalDescription(description)
      .then(() => {
        this.setLocalDescriptionSuccess(this.localPeerConnection);
      }).catch(this.setSessionDescriptionError.bind(this));

    this.trace('remotePeerConnection setRemoteDescription start.');
    this.remotePeerConnection.setRemoteDescription(description)
      .then(() => {
        this.setRemoteDescriptionSuccess(this.remotePeerConnection);
      }).catch(this.setSessionDescriptionError.bind(this));

    this.trace('remotePeerConnection createAnswer start.');
    this.remotePeerConnection.createAnswer()
      .then(this.createdAnswer.bind(this))
      .catch(this.setSessionDescriptionError.bind(this));
  }

  // Logs answer to offer creation and sets peer connection session descriptions.
  private createdAnswer(description: RTCSessionDescription): void {
    this.trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

    this.trace('remotePeerConnection setLocalDescription start.');
    this.remotePeerConnection.setLocalDescription(description)
      .then(_ => this.setLocalDescriptionSuccess(this.remotePeerConnection))
      .catch(this.setSessionDescriptionError.bind(this));

    this.trace('localPeerConnection setRemoteDescription start.');
    this.localPeerConnection.setRemoteDescription(description)
      .then(_ => this.setRemoteDescriptionSuccess(this.localPeerConnection))
      .catch(this.setSessionDescriptionError.bind(this));
  }

  private setRemoteMediaStream(event): void {
    this.remoteVideoPlayer.srcObject = event.stream;
    this.remoteStream = event.stream;
    this.trace('Remote peer connection received remote stream.');
  }

  private handleConnection(event): void {
    const peerConnection = event.target;
    const iceCandidate = event.candidate;

    if (iceCandidate) {
      const newIceCandidate = new RTCIceCandidate(iceCandidate);
      const otherPeer = this.getOtherPeer(peerConnection);

      otherPeer.addIceCandidate(newIceCandidate)
        .then(() => {
          this.trace(`${this.getPeerName(peerConnection)} addIceCandidate success.`);
        }).catch((err: any) => {
          this.trace(`${this.getPeerName(peerConnection)} failed to add ICE Candidate:\n ${err.toString()}.`);
        });

      this.trace(`${this.getPeerName(peerConnection)} ICE candidate:\n` +
        `${event.candidate.candidate}.`);
    }
  }

  private handleConnectionChange(event): void {
    const peerConnection = event.target as RTCPeerConnection;
    console.log('ICE state change event: ', event);
    this.trace(`${this.getPeerName(peerConnection)} ICE state: ${peerConnection.iceConnectionState}.`);
  }


  //#region utility
  private setSessionDescriptionError(error: any): void {
    this.trace(`Failed to create session description: ${error.toString()}.`);
  }

  // Logs success when setting session description.
  private setDescriptionSuccess(peerConnection: RTCPeerConnection, functionName: string): void {
    const peerName = this.getPeerName(peerConnection);
    this.trace(`${peerName} ${functionName} complete.`);
  }

  // Logs success when localDescription is set.
  private setLocalDescriptionSuccess(peerConnection: RTCPeerConnection): void {
    this.setDescriptionSuccess(peerConnection, 'setLocalDescription');
  }

  // Logs success when remoteDescription is set.
  private setRemoteDescriptionSuccess(peerConnection: RTCPeerConnection): void {
    this.setDescriptionSuccess(peerConnection, 'setRemoteDescription');
  }

  private getPeerName(conn: RTCPeerConnection): string {
    return (conn === this.localPeerConnection) ? 'localPeerConnection' : 'remotePeerConnection';
  }

  private getOtherPeer(peerConnection): RTCPeerConnection {
    return (peerConnection === this.localPeerConnection) ? this.remotePeerConnection : this.localPeerConnection;
  }

  private trace(text: string): void {
    text = text.trim();
    const now = new Date().toLocaleTimeString();

    console.log(now, text);
  }
  //#endregion

}
