<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
  <input
    type="text"
    value={subject}
    onChange={e => setSubject(e.target.value)}
    disabled={isScanning}
    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50"
    placeholder="e.g. Data Structures"
  />
</div>