export const services = {
'personal-assistant':{name:'Personal Assistant',plans:{one:2500,five:10000,ten:19000}},
'rtb-advocacy':{name:'RTB Advocacy',plans:{hour:4000,session:10000,evidence:22500}},
'web-design':{name:'Web Design',plans:{landing:10000,business:50000,hour:3500}},
'wp-managment':{name:'WordPress Management',plans:{essential:4000,content:9000,hour:3500}},
'graphic-design':{name:'Graphic Design',plans:{piece:5000,set:15000,identity:22500}},
'resume-building':{name:'Resume Building',plans:{refresh:4000,fresh:7500,application:10000}}
};
export function quote(input) {
 const service=Object.hasOwn(services,input.product)&&services[input.product];
 if(!service||!Object.hasOwn(service.plans,input.plan))throw Error('Unknown service or plan');
 if(input.product==='wp-managment'&&input.plan!=='hour')throw Error('Recurring billing is not enabled');
 const quantity=input.quantity??1;
 if(!Number.isInteger(quantity)||quantity<1||quantity>100||(input.plan!=='hour'&&quantity!==1))throw Error('Invalid quantity');
 const brief=typeof input.brief==='string'?input.brief.trim():'';
 if(brief.length<5||brief.length>3000)throw Error('Describe the scope in 5–3000 characters');
 return {product:input.product,plan:input.plan,quantity,brief,total_cents:service.plans[input.plan]*quantity,currency:'cad'};
}
export function paidSessionMatches(order, session) {
 return session.livemode===false&&session.mode==='payment'&&session.payment_status==='paid'&&
 session.currency==='cad'&&session.amount_total===order.total_cents&&
 session.metadata?.order_id===order.id&&session.client_reference_id===order.id&&
 session.metadata?.user_id===order.user_id&&session.id===order.stripe_session_id;
}

