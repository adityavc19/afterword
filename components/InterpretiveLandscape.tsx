import { InterpretiveLandscape as ILType } from '@/types';

interface Props {
  landscape: ILType;
}

export default function InterpretiveLandscape({ landscape }: Props) {
  return (
    <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-5 space-y-4">
      <h2 className="text-xs font-semibold tracking-widest text-stone-500 uppercase">
        How This Book Is Read
      </h2>

      <div className="space-y-4">
        <div>
          <p className="text-xs text-stone-500 font-medium mb-1 uppercase tracking-wider">Critics</p>
          <p className="text-stone-300 text-sm leading-relaxed">{landscape.criticConsensus}</p>
        </div>

        <div className="border-t border-stone-800" />

        <div>
          <p className="text-xs text-stone-500 font-medium mb-1 uppercase tracking-wider">Readers</p>
          <p className="text-stone-300 text-sm leading-relaxed">{landscape.readerSentiment}</p>
        </div>

        <div className="border-t border-stone-800" />

        <div>
          <p className="text-xs text-stone-500 font-medium mb-1 uppercase tracking-wider">The Debate</p>
          <p className="text-stone-300 text-sm leading-relaxed">{landscape.theDebate}</p>
        </div>
      </div>
    </div>
  );
}
