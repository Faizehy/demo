import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WatchedNameAuction {
  name: string;
  endsAt: number;
}

export interface LocalAuctionBid {
  name: string;
  amountStroops: string;
  depositStroops: string;
  saltHex: string;
  revealed: boolean;
}

interface NameWatchlistState {
  watchedAuctions: WatchedNameAuction[];
  bids: Record<string, LocalAuctionBid>;
  watchAuction: (auction: WatchedNameAuction) => void;
  unwatchAuction: (name: string) => void;
  saveBid: (bid: LocalAuctionBid) => void;
  markBidRevealed: (name: string) => void;
  removeBid: (name: string) => void;
}

const normalizeName = (name: string) => name.trim().toLowerCase();

export const useNameWatchlistStore = create<NameWatchlistState>()(
  persist(
    (set) => ({
      watchedAuctions: [],
      bids: {},
      watchAuction: (auction: WatchedNameAuction) =>
        set((state: NameWatchlistState) => {
          const name = normalizeName(auction.name);
          return {
            watchedAuctions: [
              ...state.watchedAuctions.filter((item) => item.name !== name),
              { ...auction, name },
            ],
          };
        }),
      unwatchAuction: (name: string) =>
        set((state: NameWatchlistState) => ({
          watchedAuctions: state.watchedAuctions.filter(
            (item) => item.name !== normalizeName(name),
          ),
        })),
      saveBid: (bid: LocalAuctionBid) =>
        set((state: NameWatchlistState) => {
          const name = normalizeName(bid.name);
          return { bids: { ...state.bids, [name]: { ...bid, name } } };
        }),
      markBidRevealed: (name: string) =>
        set((state: NameWatchlistState) => {
          const key = normalizeName(name);
          const bid = state.bids[key];
          if (!bid) return state;
          return { bids: { ...state.bids, [key]: { ...bid, revealed: true } } };
        }),
      removeBid: (name: string) =>
        set((state: NameWatchlistState) => {
          const bids = { ...state.bids };
          delete bids[normalizeName(name)];
          return { bids };
        }),
    }),
    { name: 'wraith-name-auction-watchlist' },
  ),
);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'wraith-name-auction-watchlist') {
      if (e.newValue) {
        useNameWatchlistStore.persist.rehydrate();
      } else {
        useNameWatchlistStore.setState({ watchedAuctions: [], bids: {} });
      }
    } else if (e.key === null) {
      useNameWatchlistStore.setState({ watchedAuctions: [], bids: {} });
    }
  });
}
