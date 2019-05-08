import { Component, ViewChild, ElementRef, Renderer2, AfterViewInit } from '@angular/core';

const mediaStreamConstraints: MediaStreamConstraints = {
  video: true
};

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements AfterViewInit {
  @ViewChild('video') videoEl: ElementRef;

  private localStream: MediaStream;
  private videoPlayer: HTMLVideoElement;

  constructor(private _renderer: Renderer2) {}

  ngAfterViewInit() {
    this.videoPlayer = this._renderer.selectRootElement(this.videoEl.nativeElement);

    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
      .then((stream: MediaStream) => {
        this.localStream = stream;
        this.videoPlayer.srcObject = stream;
      })
      .catch((err: string) => {
        alert(err);
      });
  }

}
