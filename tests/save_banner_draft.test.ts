import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {saveMonitor} from '../src/ui/state';
import {refreshSaveFailedBanner} from '../src/ui/saveBanner';
const clear=()=>{for(const[key]of saveMonitor.entries())saveMonitor.ok(key)};
beforeEach(()=>{clear();document.body.innerHTML='<div id="app"><main><input id="draft"></main><nav class="bottom-tabs"></nav></div>';});
afterEach(()=>{vi.restoreAllMocks();clear();document.body.replaceChildren();});
it('save failure and recovery keep the same unfinished form, value and selection',()=>{
 const input=document.querySelector<HTMLInputElement>('#draft')!;input.value='unfinished';input.focus();input.setSelectionRange(2,5);
 const unsubscribe=saveMonitor.subscribe(()=>refreshSaveFailedBanner('en'));
 saveMonitor.fail('tm:demo:failed','{}');
 const banner=document.querySelector('[data-save-failed]')!;expect(banner).not.toBeNull();
 saveMonitor.fail('tm:demo:another','{}');expect(document.querySelectorAll('[data-save-failed]')).toHaveLength(1);expect(document.querySelector('[data-save-failed]')).toBe(banner);
 saveMonitor.ok('tm:demo:failed');expect(banner.isConnected).toBe(true);saveMonitor.ok('tm:demo:another');
 expect(banner.isConnected).toBe(false);expect(document.querySelector('#draft')).toBe(input);expect(input.value).toBe('unfinished');expect([input.selectionStart,input.selectionEnd]).toEqual([2,5]);expect(document.activeElement).toBe(input);unsubscribe();
});
it('does not expose failure details on first-run or locked surfaces',()=>{
 document.querySelector('nav')!.remove();saveMonitor.fail('tm:demo:failed','{}');refreshSaveFailedBanner('en');expect(document.querySelector('[data-save-failed]')).toBeNull();
});
