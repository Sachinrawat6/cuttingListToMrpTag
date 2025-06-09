import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const UploadCsv = () => {
  const [csvData, setCsvData] = useState([]);
  const [fileName, SetFileName] = useState("");
  const [product, setProductsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const tagRefs = useRef([]);

  // Fetch MRP data from product API
  const fetchProducts = async () => {
    const response = await fetch(
      "https://inventorybackend-m1z8.onrender.com/api/product"
    );
    const result = await response.json();
    setProductsData(result);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle CSV upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    SetFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const parsedData = results.data.map((row) => {
          const styleNumber = row["Style Number"] || "";
          const size = row["Size"] || "";
          const color = row["Color"] || "";
          
          const order_id = row["(Do not touch) Order Id"] || "";
          return {
            styleNumber,
            size,
            color,
            order_id,
          };
        });
        setCsvData(parsedData);
      },
      error: function (error) {
        alert(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  // Generate PDF of all tag labels
  const handleDownload = async () => {
    setLoading(true);
    setProgress(0);
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [100, 50],
      });

      const totalTags = tagRefs.current.length;
      
      for (let i = 0; i < totalTags; i++) {
        const tag = tagRefs.current[i];
        if (tag) {
          const canvas = await html2canvas(tag);
          const imgData = canvas.toDataURL("image/png");
          if (i !== 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, 0, 100, 50);
          
          // Update progress
          const currentProgress = Math.floor(((i + 1) / totalTags) * 100);
          setProgress(currentProgress);
        }
      }

      pdf.save("tag-labels.pdf");
    } catch (error) {
      alert("Failed to download Tag.");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Upload box */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow relative">
        <h2 className="text-2xl font-semibold mb-2">
          Upload <span className="text-blue-600">Sorted Cutting List</span>
        </h2>
        <p className="text-sm text-gray-500 mb-3 ">CSV files only</p>
        <div className="mt-6"> 
          <a href="tag_sample.csv" className="bg-blue-400 text-white hover:bg-blue-500 duration-75 absolute top-0 right-0 py-3 rounded-xl cursor-pointer px-4">
            Download Sample File
          </a> 
        </div>

        <label className="w-full flex items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer">
          <div className="text-center">
            <p className="text-gray-600">Click to upload or drag CSV here</p>
            <p className="text-xs text-gray-400">Accepted: .csv</p>
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {fileName && (
          <div className="mt-4 text-sm text-green-700 font-medium">
            ✅ {fileName} uploaded successfully.
          </div>
        )}
      </div>

      {/* Download button and progress bar */}
      {csvData.length > 0 && (
        <div className="flex flex-col items-end mb-4 gap-2">
          {loading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
              <div className="text-sm text-gray-600 mt-1 text-right">
                Generating: {progress}% completed
              </div>
            </div>
          )}
          <button
            onClick={handleDownload}
            disabled={loading}
            className={`${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6 py-2 rounded-md shadow`}
          >
            {loading ? `Generating... (${progress}%)` : "Download Tag"}   
          </button>
        </div>
      )}

      {/* Tag labels */}
      <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[600px]">
        {csvData.map((row, index) => {
          const ref = (el) => (tagRefs.current[index] = el);
          const matched =
            product.find((p) => p.style_code === Number(row.styleNumber));
          return (
            <div
              ref={ref}
              key={index}
              style={{
                width: "378px",
                height: "189px",
                padding: "10px",
                backgroundColor: "#fff",
                color: "#000",
                fontSize: "12px",
                fontFamily: "sans-serif",
                // border: "1px solid #ccc",
                position: "relative",
              }}
              className="font-bold"
            >
              <p className="w-70">Product : {matched?.style_name || "Qurvii Product"} </p>
              <p>
                Brand: Qurvii | SKU: {row.styleNumber}-{row.color}-{row.size}
              </p>
              <p className="capitalize">
                Color: {row.color} | Size: {row.size}
              </p>
              <p>MRP: ₹{matched?.mrp || "NA"} (Incl. of all taxes)</p>
              <p>Net Qty: 1 | Unit: 1 Pcs</p>
              <p>
                MFG & MKT BY: Qurvii, 2nd Floor, B-149 <br/>Sector-6, Noida, UP,
                201301
              </p>
              <p>Contact: support@qurvii.com</p>
              <p className="absolute bottom-11 right-8">
                Order Id: {row.order_id}
              </p>
              <div className="absolute top-10 right-8">
                <QRCodeSVG value={row.order_id} size={80} level="H" />
              </div> 
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UploadCsv;