/* PORT: saves go through the Artifacts `downloads` capability. Resolves true when the viewer
   accepted the save, false when they declined; rejects on a platform fault. */
async function dlBlob(text,mime,name){
  const dl=await window.RVZ_DOWNLOADS_P;
  if(!dl) throw Object.assign(new Error("Saving files is not available in this viewer."),{code:"unavailable"});
  const data=(typeof text==="string")?text:new Blob([text],{type:mime});
  try{ await dl.save({filename:name, data:data}); return true; }
  catch(e){
    const c=e&&e.code;
    if(c==="declined"||c==="cancelled"||c==="canceled"||c==="aborted"||c==="user_declined") return false;
    throw e;
  }
}
