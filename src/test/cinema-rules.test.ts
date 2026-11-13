import { describe, expect, it } from 'vitest';
import { canRegister } from '@/lib/cinema';
const opens='2026-11-01T00:00:00Z';const closes='2026-11-13T20:00:00Z';const now=Date.parse('2026-11-11T12:00:00Z');
describe('Screening registration',()=>{
 it('allows registration only when the state is Registration Open',()=>{expect(canRegister('Registration Open',opens,closes,0,50,now)).toBe(true);for(const state of ['Upcoming','Waiting Room','Live','Finished','Cancelled'])expect(canRegister(state,opens,closes,0,50,now)).toBe(false);});
 it('allows registration regardless of participant count (no seat limit)',()=>{expect(canRegister('Registration Open',opens,closes,50,50,now)).toBe(true);expect(canRegister('Registration Open',opens,closes,1000,50,now)).toBe(true);});
 it('allows registrations only within the configured registration period',()=>{expect(canRegister('Registration Open',opens,closes,0,50,Date.parse(opens)-1)).toBe(false);expect(canRegister('Registration Open',opens,closes,0,50,Date.parse(opens))).toBe(true);expect(canRegister('Registration Open',opens,closes,0,50,Date.parse(closes))).toBe(false);});
});