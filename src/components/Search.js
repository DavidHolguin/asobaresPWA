import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const ImageFromS3 = ({ imageUrl, alt }) => {
  const [error, setError] = useState(false);

  if (error) {
    return <img src="/api/placeholder/400/320" alt={alt} className="w-full h-48 object-cover rounded-md mb-2" />;
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className="w-full h-48 object-cover rounded-md mb-2"
      onError={() => setError(true)}
    />
  );
};

const CategorySlider = ({ categories, selectedCategories, onCategoryToggle }) => {
  const sliderRef = useRef(null);

  useEffect(() => {
    const slider = sliderRef.current;
    let isDown = false;
    let startX;
    let scrollLeft;

    const handleMouseDown = (e) => {
      isDown = true;
      slider.classList.add('active');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
      slider.classList.remove('active');
    };

    const handleMouseUp = () => {
      isDown = false;
      slider.classList.remove('active');
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 3;
      slider.scrollLeft = scrollLeft - walk;
    };

    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('mouseleave', handleMouseLeave);
    slider.addEventListener('mouseup', handleMouseUp);
    slider.addEventListener('mousemove', handleMouseMove);

    return () => {
      slider.removeEventListener('mousedown', handleMouseDown);
      slider.removeEventListener('mouseleave', handleMouseLeave);
      slider.removeEventListener('mouseup', handleMouseUp);
      slider.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div 
      ref={sliderRef} 
      className="flex overflow-x-auto space-x-2 py-4 px-2 mb-4 cursor-grab active:cursor-grabbing"
      style={{
        overscrollBehaviorX: 'contain',
        scrollSnapType: 'x mandatory',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      <style>
        {`
          .overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onCategoryToggle(category.id)}
          className={`
            py-2 px-6 rounded-full whitespace-nowrap transition-all duration-300 ease-in-out
            ${selectedCategories.includes(category.id)
              ? 'bg-[#09FDFD] text-white shadow-lg scale-105'
              : 'bg-white text-gray-800 hover:bg-gray-100'
            }
            border border-gray-200
            backdrop-filter backdrop-blur-sm bg-opacity-30
            hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#09FDFD] focus:ring-opacity-50
            transform hover:scale-105
            scroll-snap-align: start;
          `}
          style={{
            boxShadow: selectedCategories.includes(category.id)
              ? '0 10px 15px -3px rgba(9, 253, 253, 0.1), 0 4px 6px -2px rgba(9, 253, 253, 0.05)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
};

const Search = () => {
  const [activeTab, setActiveTab] = useState('companies');
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredResults, setFilteredResults] = useState({ companies: [], products: [] });
  const [error, setError] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [companiesResponse, productsResponse, categoriesResponse] = await Promise.all([
          axios.get('https://backendfindout-ea692e018a66.herokuapp.com/api/companies/', config),
          axios.get('https://backendfindout-ea692e018a66.herokuapp.com/api/products/', config),
          axios.get('https://backendfindout-ea692e018a66.herokuapp.com/api/categories/', config),
        ]);

        setCompanies(companiesResponse.data);
        setProducts(productsResponse.data);
        setCategories(categoriesResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(
          error.response?.status === 403
            ? 'No tienes permiso para acceder a esta información. Por favor, inicia sesión o contacta al administrador.'
            : 'Ha ocurrido un error al cargar los datos. Por favor, intenta de nuevo más tarde.'
        );
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const filterResults = () => {
      const lowercaseQuery = query.toLowerCase();
      
      const filteredCompanies = companies.filter(company => {
        const companyMatches = company.name.toLowerCase().includes(lowercaseQuery);
        const hasMatchingProducts = products.some(product => 
          product.company === company.id && 
          product.name.toLowerCase().includes(lowercaseQuery) &&
          (selectedCategories.length === 0 || selectedCategories.includes(product.category))
        );
        return companyMatches || hasMatchingProducts;
      });

      const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(lowercaseQuery) &&
        (selectedCategories.length === 0 || selectedCategories.includes(product.category))
      );

      setFilteredResults({ companies: filteredCompanies, products: filteredProducts });
    };

    filterResults();
  }, [query, companies, products, selectedCategories]);

  const handleSearch = (e) => {
    setQuery(e.target.value);
  };

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const renderCompanies = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {filteredResults.companies.map(company => (
        <div key={company.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow duration-300">
          {company.profile_picture && (
            <ImageFromS3
              imageUrl={company.profile_picture}
              alt={company.name}
            />
          )}
          <h3 className="text-xl font-semibold">{company.name}</h3>
          {company.description && (
            <p className="text-gray-600 leading-5">{company.description.slice(0, 100)}...</p>
          )}
          <Link to={`/company/${company.id}`} className="mt-2 inline-block text-blue-600 hover:underline">
            Ver detalles
          </Link>
        </div>
      ))}
    </div>
  );

  const renderProducts = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredResults.products.map(product => (
        <div key={product.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow duration-300">
          {product.image && (
            <ImageFromS3
              imageUrl={product.image}
              alt={product.name}
            />
          )}
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <p className="text-gray-600">{product.price}</p>
          <Link to={`/product/${product.id}`} className="mt-2 inline-block text-blue-600 hover:underline">
            Ver detalles
          </Link>
        </div>
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="container px-4 pb-12 mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 pb-12 mx-auto">
      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          placeholder="Buscar empresas, productos o servicios..."
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="flex w-full rounded-full overflow-hidden">
        <button
          onClick={() => setActiveTab('companies')}
          className={`flex-1 py-2 text-center ${activeTab === 'companies' ? 'bg-[#09FDFD] text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Business
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-2 text-center ${activeTab === 'products' ? 'bg-[#09FDFD] text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Products 
        </button>
      </div>

      <CategorySlider 
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoryToggle={handleCategoryToggle}
      />

      {activeTab === 'companies' && renderCompanies()}
      {activeTab === 'products' && renderProducts()}
    </div>
  );
};

export default Search;