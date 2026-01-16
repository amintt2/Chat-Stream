export type SignalingMessageType =
  | 'join-stream'
  | 'leave-stream'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'peer-list'
  | 'chunk-map'
  | 'request-chunk'
  | 'peer-disconnected'
  | 'stream-ended'
  | 'heartbeat';

export interface SignalingMessage {
  type: SignalingMessageType;
  payload: unknown;
  from: string;
  to?: string; // undefined = broadcast
  streamId: string;
  timestamp: number;
}

export interface JoinStreamPayload {
  streamId: string;
  peerId: string;
  isStreamer: boolean;
}

export interface PeerListPayload {
  peers: Array<{
    id: string;
    score: number;
    chunksAvailable: number[];
  }>;
}

export interface OfferAnswerPayload {
  sdp: RTCSessionDescriptionInit;
  targetPeerId: string;
}

export interface IceCandidatePayload {
  candidate: RTCIceCandidateInit;
  targetPeerId: string;
}
