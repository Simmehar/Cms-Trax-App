import {createContext, useEffect, useState} from 'react';
import {filterSortPackages} from '../util/apiCalls';
import checkoutUserData from '../db/dbcrud/dbCheckout.crud';

const SearchContext = createContext({});

const SearchProvider = ({children}) => {
  const [packages, setPackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [isSearchListOn, setIsSearchListOn] = useState(false);
  const [searchedPackages, setSearchedPackages] = useState([]);
  const [searchPhrase, setSearchPhrase] = useState('');
  const [filteredShip, setFilteredShip] = useState([]);
  const [isFilter, setIsfilter] = useState(false);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [filterPagination, setFilterPagination] = useState({
    next: null,
    previous: null,
  });
  const [SelectedShipId, setSelectedShipId] = useState();
  const [selectedUser, setSelectedUser] = useState();
  const [enabledSortField, setEnabledSortField] = useState();
  const [isIncreasing, setIsIncreasing] = useState(true);
  const [selcetAllCheck, setSelectAllCheck] = useState(false);
  const [selcetAllSearchCheck, setSelectAllSearchCheck] = useState(false);
  const [checkedOutPackages, setCheckedOutPackages] = useState([]);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const allRecords = await checkoutUserData.getAllRecords(); // Get all records
        const packageIdsArray = allRecords.map(item =>
          JSON.parse(item.packagesId),
        );
        const mergedPackageIds = packageIdsArray.reduce(
          (acc, curr) => acc.concat(curr),
          [],
        );
        setCheckedOutPackages(mergedPackageIds);
      } catch (error) {
        console.error('Error fetching records:', error);
      }
    };

    fetchRecords();
  }, []);

  const checkPackage = (item, isPackageSearched) => {
    if (!item?.id) return;
    //if package exists inside packages state
    let index = selectedPackages?.findIndex(p => p?.id === item?.id);

    if (index != -1) {
      const updatedPackages = selectedPackages?.filter(p => p?.id != item?.id);
      return setSelectedPackages(updatedPackages);
    } else {
      setSelectedPackages(prevSP => [...prevSP, item]);
    }

    //if package exists inside packages state
    // if (packages.find(p => p?.id === item?.id)) {
    //     setPackages(packages.map(p => {
    //         if (p.id === item?.id) {
    //             return { ...p, isChecked: !p?.isChecked };
    //         }
    //         return p;
    //     }).sort(function (x, y) {
    //         //sort checked values at top
    //         return (x?.isChecked === y?.isChecked) ? 0 : x.isChecked ? -1 : 1;
    //     }));
    // } else {
    //     //does not exists inside packages state :-> add item to array
    //     let newPackages = [...packages, { ...item, isChecked: !item?.isChecked }];
    //     setPackages(newPackages.sort(function (x, y) {
    //         //sort checked values at top
    //         return (x?.isChecked === y?.isChecked) ? 0 : x.isChecked ? -1 : 1;
    //     }));
    // }
    // if (isPackageSearched) {
    //     setSearchedPackages(searchedPackages.map(p => {
    //         if (p.id === item?.id) {
    //             return { ...p, isChecked: !p?.isChecked };
    //         }
    //         return p;
    //     }).sort(function (x, y) {
    //         //sort checked values at top
    //         return (x?.isChecked === y?.isChecked) ? 0 : x.isChecked ? -1 : 1;
    //     }));
    // }
  };

  const checkMultiplePackages = packages => {
    if (!packages) return;
    let selectedPackageIds = selectedPackages?.map(p => p?.id);
    let uniquePackages = packages?.filter(
      obj => !selectedPackageIds.includes(obj?.id),
    );
    setSelectedPackages(prevSP => [...prevSP, ...uniquePackages]);
  };
  const checkAllPackages = () => {
    let selectedPackageIds = selectedPackages?.map(p => p?.id) || [];
    const filteredCheckedOutPackages = checkedOutPackages
      ? checkedOutPackages.filter(pkgId => !selectedPackageIds.includes(pkgId))
      : [];
    const allPackages = isSearchListOn ? searchedPackages : packages;
    let uniquePackages = allPackages
      ? allPackages.filter(
          obj =>
            obj &&
            !selectedPackageIds.includes(obj?.id) &&
            !(
              filteredCheckedOutPackages &&
              filteredCheckedOutPackages.includes(obj?.id)
            ),
        )
      : [];
    setSelectedPackages(prevSP => [...prevSP, ...uniquePackages]);
  };

  const clearSelectedPackages = () => {
    // setPackages(packages.map(p => {
    //     if (p?.isChecked == true) {
    //         return { ...p, isChecked: false };
    //     }
    //     return p;
    // }));
    // setSearchedPackages(searchedPackages.map(p => {
    //     if (p?.isChecked == true) {
    //         return { ...p, isChecked: false };
    //     }
    //     return p;
    // }));

    setSelectedPackages([]);
    setSelectAllCheck(false);
    setSelectAllSearchCheck(false);
  };

  const fetchFilterSortPackages = async user => {
    let sortParam = !isIncreasing
      ? '&sort_by=-' + enabledSortField
      : '&sort_by=' + enabledSortField;
    let params = '';
    if (isSearchListOn) {
      if (SelectedShipId && enabledSortField && selectedUser) {
        params =
          '?keyword=' +
          searchPhrase +
          '&ship=' +
          SelectedShipId?.id +
          sortParam +
          '&user=' +
          selectedUser?.id;
      } else if (SelectedShipId && enabledSortField) {
        params =
          '?keyword=' +
          searchPhrase +
          '&ship=' +
          SelectedShipId?.id +
          sortParam;
      } else if (SelectedShipId && selectedUser) {
        params =
          '?keyword=' +
          searchPhrase +
          '&ship=' +
          SelectedShipId?.id +
          '&user=' +
          selectedUser?.id;
      } else if (selectedUser && enabledSortField) {
        params =
          '?keyword=' + searchPhrase + '&user=' + selectedUser?.id + sortParam;
      } else if (enabledSortField) {
        params = !isIncreasing
          ? '?keyword=' + searchPhrase + '&sort_by=-' + enabledSortField
          : '?keyword=' + searchPhrase + '&sort_by=' + enabledSortField;
      } else if (SelectedShipId) {
        params = '?keyword=' + searchPhrase + '&ship=' + SelectedShipId?.id;
      } else if (selectedUser) {
        params = '?keyword=' + searchPhrase + '&user=' + selectedUser?.id;
      }
    } else {
      if (SelectedShipId && enabledSortField && selectedUser) {
        params =
          '?ship=' +
          SelectedShipId?.id +
          sortParam +
          '&user=' +
          selectedUser?.id;
      } else if (SelectedShipId && enabledSortField) {
        params = '?ship=' + SelectedShipId?.id + sortParam;
      } else if (SelectedShipId && selectedUser) {
        params = '?ship=' + SelectedShipId?.id + '&user=' + selectedUser?.id;
      } else if (selectedUser && enabledSortField) {
        params = '?user=' + selectedUser?.id + sortParam;
      } else if (enabledSortField) {
        params = !isIncreasing
          ? '?sort_by=-' + enabledSortField
          : '?sort_by=' + enabledSortField;
      } else if (SelectedShipId) {
        params = '?ship=' + SelectedShipId?.id;
      } else if (selectedUser) {
        params = '?user=' + selectedUser?.id;
      }
    }

    const res = await filterSortPackages(user, params);
    return res;
  };

  const clearFilterSort = () => {
    setSelectedShipId();
    setSelectedUser();
    setEnabledSortField();
  };
  return (
    <SearchContext.Provider
      value={{
        packages,
        setPackages,
        checkPackage,
        isSearchListOn,
        setIsSearchListOn,
        searchedPackages,
        setSearchedPackages,
        searchPhrase,
        setSearchPhrase,
        clearSelectedPackages,
        checkAllPackages,
        setFilteredShip,
        filteredShip,
        isFilter,
        setIsfilter,
        isPaginationLoading,
        setIsPaginationLoading,
        filterPagination,
        setFilterPagination,
        SelectedShipId,
        setSelectedShipId,
        enabledSortField,
        setEnabledSortField,
        fetchFilterSortPackages,
        selectedUser,
        setSelectedUser,
        clearFilterSort,
        isIncreasing,
        setIsIncreasing,
        selectedPackages,
        setSelectedPackages,
        checkMultiplePackages,
        selcetAllCheck,
        setSelectAllCheck,
        selcetAllSearchCheck,
        setSelectAllSearchCheck,
        checkedOutPackages,
        setCheckedOutPackages,
      }}>
      {children}
    </SearchContext.Provider>
  );
};

export {SearchContext, SearchProvider};
