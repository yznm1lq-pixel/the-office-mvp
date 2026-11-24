"use client";
import {useState} from "react";
import {updateMyProfile} from "@/app/actions";
import {createClient} from "@/lib/supabase/client";

type Profile={full_name?:string|null;job_title?:string|null;bio?:string|null;avatar_url?:string|null;website_url?:string|null;social_links?:Record<string,string|null>|null};
const emojis=["🦊","🐼","🦉","🐯","🦁","🐨","🐸","🐙","🧑🏻‍💻","👩🏻‍💻","🧑🏽‍🎨","👨🏻‍🚀","🌿","🚀","🎯","💡","✨","🧠","☕","🌵","🪴","🦋"];
export default function ProfileEditor({userId,profile,next="/profile"}:{userId:string;profile:Profile;next?:string}){
 const [emoji,setEmoji]=useState(profile.avatar_url&&!profile.avatar_url.startsWith("http")?profile.avatar_url:"🦊");
 const [avatarUrl,setAvatarUrl]=useState(profile.avatar_url?.startsWith("http")?profile.avatar_url:"");
 const [uploading,setUploading]=useState(false);const [uploadError,setUploadError]=useState("");
 async function upload(file?:File){
  if(!file)return;
  if(!file.type.startsWith("image/")||file.size>5*1024*1024){setUploadError("اختر صورة بصيغة مدعومة وحجم أقل من 5MB.");return;}
  setUploading(true);setUploadError("");
  const supabase=createClient();const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
  const path=userId+"/"+Date.now()+"."+ext;
  const {error}=await supabase.storage.from("avatars").upload(path,file,{upsert:true,contentType:file.type});
  if(error){setUploadError("تعذر رفع الصورة. حاول مرة أخرى.");setUploading(false);return;}
  const {data}=supabase.storage.from("avatars").getPublicUrl(path);setAvatarUrl(data.publicUrl);setUploading(false);
 }
 return <form action={updateMyProfile} className="profile-editor">
  <input type="hidden" name="next" value={next}/><input type="hidden" name="avatarUrl" value={avatarUrl}/><input type="hidden" name="emoji" value={emoji}/>
  <section className="profile-identity-card"><div className="profile-avatar-preview">{avatarUrl?<img src={avatarUrl} alt="معاينة صورتك"/>:<span>{emoji}</span>}</div><div className="profile-upload-copy"><span className="eyebrow">هويتك داخل المكتب</span><h2>خلّ الفريق يعرفك</h2><p>صورتك أو شخصيتك ستظهر بجانب اسمك وعلى مقعدك داخل المكتب الافتراضي.</p><label className="profile-upload-button">{uploading?"جارٍ رفع الصورة…":"رفع صورة من الجهاز"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>upload(e.target.files?.[0])} disabled={uploading}/></label>{uploadError&&<small className="profile-upload-error">{uploadError}</small>}</div></section>
  <div className="profile-fields-grid"><label>اسمك الكامل<input className="field" name="fullName" defaultValue={profile.full_name??""} placeholder="الاسم الذي سيظهر للفريق" minLength={2} maxLength={80} required/></label><label>المسمى الوظيفي<input className="field" name="jobTitle" defaultValue={profile.job_title??""} placeholder="مثال: مصمم تجربة مستخدم"/></label></div>
  <label>نبذة قصيرة<textarea className="field" name="bio" defaultValue={profile.bio??""} placeholder="عرّف بنفسك وبما تعمل عليه…" rows={3} maxLength={500}/></label>
  <div><div className="profile-field-label">أو اختر شخصية تعبّر عنك</div><div className="profile-emoji-grid">{emojis.map(e=><button type="button" key={e} className={emoji===e&&!avatarUrl?"selected":""} onClick={()=>{setEmoji(e);setAvatarUrl("");}}>{e}</button>)}</div></div>
  <div className="profile-fields-grid"><label>موقعك الإلكتروني<input className="field" type="url" name="websiteUrl" defaultValue={profile.website_url??""} placeholder="https://…"/></label><label>LinkedIn<input className="field" type="url" name="linkedin" defaultValue={profile.social_links?.linkedin??""} placeholder="رابط حسابك"/></label><label>حساب X<input className="field" type="url" name="x" defaultValue={profile.social_links?.x??""} placeholder="رابط حسابك"/></label><label>Instagram<input className="field" type="url" name="instagram" defaultValue={profile.social_links?.instagram??""} placeholder="رابط حسابك"/></label></div>
  <button className="primary-button profile-save" type="submit">حفظ الملف والمتابعة ←</button>
 </form>;
}
