import React from "react";

const FeatureCard = ({ icon, title, description, gradient = "from-blue-500 to-cyan-400", number = "01" }) => (
	<div className="group relative h-full">
		{/* Hover glow */}
		<div className={`absolute -inset-0.5 bg-gradient-to-r ${gradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-20 transition-all duration-500`} />
		
		<div className="relative h-full bg-white border border-gray-100 rounded-2xl p-7 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 hover:border-gray-200">
			{/* Number */}
			<span className="absolute top-5 right-6 text-5xl font-black text-gray-50 group-hover:text-gray-100 transition-colors select-none">
				{number}
			</span>
			
			{/* Icon */}
			<div className={`relative z-10 inline-flex items-center justify-center w-13 h-13 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg mb-6`}>
				{React.cloneElement(icon, { className: "text-white" })}
			</div>

			{/* Content */}
			<h3 className="relative z-10 text-lg font-bold text-gray-900 mb-3">{title}</h3>
			<p className="relative z-10 text-sm text-gray-500 leading-relaxed">{description}</p>
			
			{/* Bottom accent line */}
			<div className={`mt-6 w-10 h-1 rounded-full bg-gradient-to-r ${gradient} opacity-40 group-hover:opacity-100 group-hover:w-16 transition-all duration-500`} />
		</div>
	</div>
);

export default FeatureCard;
